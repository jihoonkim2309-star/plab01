"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { syncShuttleWeekdaysToEnrollment } from "@/lib/billing";

export async function deleteInvoice(id: string, period: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("invoices")
    .delete()
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/billing");
  redirect(`/admin/billing?ym=${period}`);
}

// 오프라인 수납 — 현금/카드(단말기)/계좌이체 수동 마킹
const OFFLINE_METHODS = {
  offline_cash: "현금",
  offline_card: "카드(단말기)",
  offline_transfer: "계좌이체",
} as const;
type OfflineMethodKey = keyof typeof OFFLINE_METHODS;

export async function markOfflinePayment(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const method = String(formData.get("payment_method") ?? "") as OfflineMethodKey;
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const receivedAmountRaw = String(formData.get("received_amount") ?? "").trim();
  const receivedAmountNum = Number(receivedAmountRaw);
  if (!receivedAmountRaw || !Number.isFinite(receivedAmountNum) || receivedAmountNum < 0)
    throw new Error("수납 금액이 올바르지 않습니다.");
  // 카드(단말기)용
  const approvalNo = String(formData.get("approval_no") ?? "").trim() || null;
  const cardBrand = String(formData.get("card_brand") ?? "").trim() || null;
  const cardApprovedAtRaw = String(formData.get("card_approved_at") ?? "").trim();
  const cardApprovedAt = cardApprovedAtRaw
    ? new Date(cardApprovedAtRaw).toISOString()
    : null;
  // 계좌이체용
  const transferName = String(formData.get("transfer_name") ?? "").trim() || null;
  const transferAtRaw = String(formData.get("transfer_at") ?? "").trim();
  const transferAt = transferAtRaw
    ? new Date(transferAtRaw).toISOString()
    : null;
  const back = String(formData.get("back") ?? "/admin/billing");
  if (!invoiceId) throw new Error("청구서 ID 가 비어 있습니다.");
  if (!(method in OFFLINE_METHODS)) throw new Error("결제 수단이 올바르지 않습니다.");

  const { data: inv, error: getErr } = await supabase
    .from("invoices")
    .select("id, amount, status, student_id")
    .eq("center_id", centerId)
    .eq("id", invoiceId)
    .single();
  if (getErr || !inv) throw new Error("청구서를 찾을 수 없습니다.");
  if ((inv as { status: string }).status === "결제완료")
    throw new Error("이미 결제완료된 청구서입니다.");

  const now = new Date().toISOString();
  const methodLabel = OFFLINE_METHODS[method];

  // 수단별 컬럼·raw + paid_at 분기:
  //   현금         → raw.memo, paid_at=now
  //   카드(단말기)   → approval_no + card_name 컬럼 + raw.memo, paid_at=승인일시
  //   계좌이체      → raw.transfer_name + transfer_at + raw.memo, paid_at=입금일시
  let payCardName: string | null = null;
  let payApprovalNo: string | null = null;
  let payPaidAt = now;
  const rawObj: Record<string, unknown> = {};
  const invoiceAmount = (inv as { amount: number }).amount;
  // 수납 금액이 청구 금액과 다를 때 추적용
  if (receivedAmountNum !== invoiceAmount) {
    rawObj.invoice_amount = invoiceAmount;
    rawObj.diff = receivedAmountNum - invoiceAmount;
  }
  if (method === "offline_card") {
    payCardName = cardBrand;
    payApprovalNo = approvalNo;
    if (cardApprovedAt) payPaidAt = cardApprovedAt;
    if (memo) rawObj.memo = memo;
  } else if (method === "offline_transfer") {
    if (transferName) rawObj.transfer_name = transferName;
    if (transferAt) rawObj.transfer_at = transferAt;
    if (transferAt) payPaidAt = transferAt;
    if (memo) rawObj.memo = memo;
  } else {
    // offline_cash
    if (memo) rawObj.memo = memo;
  }
  const payRaw = Object.keys(rawObj).length > 0 ? rawObj : null;

  const { error: payErr } = await supabase.from("payments").insert({
    center_id: centerId,
    invoice_id: invoiceId,
    amount: receivedAmountNum,
    status: "성공",
    provider: "offline",
    method: methodLabel,
    card_name: payCardName,
    approval_no: payApprovalNo,
    paid_at: payPaidAt,
    raw: payRaw,
  });
  if (payErr) throw new Error("결제 기록 실패: " + payErr.message);

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      status: "결제완료",
      paid_at: payPaidAt,
      payment_method: method,
      method: methodLabel,
    })
    .eq("id", invoiceId)
    .eq("center_id", centerId);
  if (updErr) throw new Error("청구서 갱신 실패: " + updErr.message);

  await syncShuttleWeekdaysToEnrollment(
    supabase,
    centerId,
    (inv as { student_id: string }).student_id,
  );

  revalidatePath("/admin/billing");
  revalidatePath("/admin/payment-status");
  redirect(back);
}

// 환불 처리 — 결제완료된 청구서를 환불 상태로 전환 + payments 에 환불 행 기록.
// PortOne 자동 환불 API 호출은 추후 (Phase 2) — 현재는 상태·기록만.
export async function refundInvoice(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const invoiceId = String(formData.get("invoice_id") ?? "");
  const reason = String(formData.get("reason") ?? "").trim() || null;
  const back = String(formData.get("back") ?? "/admin/billing");
  if (!invoiceId) throw new Error("청구서 ID 가 비어 있습니다.");

  const { data: inv, error: getErr } = await supabase
    .from("invoices")
    .select("id, amount, status, payment_method")
    .eq("center_id", centerId)
    .eq("id", invoiceId)
    .single();
  if (getErr || !inv) throw new Error("청구서를 찾을 수 없습니다.");
  const cur = inv as { status: string; amount: number; payment_method: string | null };
  if (cur.status !== "결제완료")
    throw new Error("결제완료된 청구서만 환불 가능합니다.");

  const now = new Date().toISOString();

  const { error: payErr } = await supabase.from("payments").insert({
    center_id: centerId,
    invoice_id: invoiceId,
    amount: cur.amount,
    status: "환불",
    provider: cur.payment_method === "pg_in_store" ? "portone" : "offline",
    paid_at: now,
    raw: reason ? { refund_reason: reason } : null,
  });
  if (payErr) throw new Error("환불 기록 실패: " + payErr.message);

  const { error: updErr } = await supabase
    .from("invoices")
    .update({ status: "환불" })
    .eq("id", invoiceId)
    .eq("center_id", centerId);
  if (updErr) throw new Error("청구서 갱신 실패: " + updErr.message);

  revalidatePath("/admin/billing");
  revalidatePath("/admin/payment-status");
  redirect(back);
}

// 학부모 포털 결제 요청 — 알림 큐잉만 (Phase 2 실 전송)
export async function requestParentPayment(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const back = String(formData.get("back") ?? "/admin/billing");

  // 행별 삭제 — 외곽 일괄 form 을 공유한다 (중첩 <form> 회피).
  // 삭제 ConfirmButton 이 __delete_id 를 hidden 으로 주입해 같은 form 으로 제출.
  const deleteId = String(formData.get("__delete_id") ?? "");
  if (deleteId) {
    const { error } = await supabase
      .from("invoices")
      .delete()
      .eq("id", deleteId)
      .eq("center_id", centerId);
    if (error) throw new Error("삭제 실패: " + error.message);
    revalidatePath("/admin/billing");
    redirect(back);
  }

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  if (ids.length === 0) throw new Error("선택된 청구서가 없습니다.");

  const { data: invs, error: invErr } = await supabase
    .from("invoices")
    .select("id, student_id, amount, period, due_date, status, students(name)")
    .in("id", ids)
    .eq("center_id", centerId);
  if (invErr) throw new Error("청구서 조회 실패: " + invErr.message);

  const rows = (invs ?? []) as unknown as {
    id: string;
    student_id: string;
    amount: number;
    period: string;
    due_date: string | null;
    status: string;
    students: { name: string } | null;
  }[];

  const billable = rows.filter((r) => r.status !== "결제완료" && r.status !== "환불");
  if (billable.length === 0) throw new Error("요청 가능한 청구서가 없습니다.");

  const studentIds = Array.from(new Set(billable.map((r) => r.student_id)));
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id, parent:users(id, phone)")
    .in("student_id", studentIds)
    .eq("center_id", centerId)
    .eq("status", "linked");

  const parentMap = new Map<string, { id: string; phone: string | null }[]>();
  for (const l of (links ?? []) as unknown as {
    student_id: string;
    parent: { id: string; phone: string | null } | null;
  }[]) {
    if (!l.parent) continue;
    const arr = parentMap.get(l.student_id) ?? [];
    arr.push(l.parent);
    parentMap.set(l.student_id, arr);
  }

  const notifRows: Array<Record<string, unknown>> = [];
  let queuedInvoices = 0;
  for (const inv of billable) {
    const parents = parentMap.get(inv.student_id) ?? [];
    if (parents.length === 0) continue;
    queuedInvoices++;
    const studentName = inv.students?.name ?? "학생";
    const template = `[결제 요청] ${inv.period} ${studentName} 수강료 ${Number(
      inv.amount,
    ).toLocaleString()}원 결제 부탁드립니다.`;
    for (const p of parents) {
      notifRows.push({
        center_id: centerId,
        kind: "push",
        recipient: p.phone ?? p.id,
        template,
        payload: {
          type: "payment_request",
          invoice_id: inv.id,
          student_id: inv.student_id,
          period: inv.period,
          amount: inv.amount,
          due_date: inv.due_date,
          target_role: "parent",
          target_user_id: p.id,
        },
        status: "대기",
      });
    }
  }

  if (notifRows.length === 0)
    throw new Error("학부모 포털 연결된 청구서가 없습니다.");

  const { error: nErr } = await supabase.from("notifications").insert(notifRows);
  if (nErr) throw new Error("알림 큐잉 실패: " + nErr.message);

  revalidatePath("/admin/billing");
  revalidatePath("/admin/notifications");
  const sep = back.includes("?") ? "&" : "?";
  redirect(`${back}${sep}requested=${queuedInvoices}`);
}
