"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { syncShuttleWeekdaysToEnrollment } from "@/lib/billing";

export async function bulkInvoiceStatus(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const status = String(formData.get("status") ?? "");
  const period = String(formData.get("period") ?? "");
  if (ids.length === 0) throw new Error("선택된 항목이 없습니다.");
  if (!["대기", "청구", "결제완료", "실패", "환불"].includes(status))
    throw new Error("잘못된 상태입니다.");

  const patch: Record<string, string | null> = { status };
  patch.paid_at = status === "결제완료" ? new Date().toISOString() : null;

  const { error } = await supabase
    .from("invoices")
    .update(patch)
    .in("id", ids)
    .eq("center_id", centerId);
  if (error) throw new Error("처리 실패: " + error.message);

  revalidatePath("/admin/billing");
  redirect(`/admin/billing?ym=${period}`);
}

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

  const { error: payErr } = await supabase.from("payments").insert({
    center_id: centerId,
    invoice_id: invoiceId,
    amount: (inv as { amount: number }).amount,
    status: "성공",
    provider: "offline",
    method: methodLabel,
    paid_at: now,
    raw: memo ? { memo } : null,
  });
  if (payErr) throw new Error("결제 기록 실패: " + payErr.message);

  const { error: updErr } = await supabase
    .from("invoices")
    .update({
      status: "결제완료",
      paid_at: now,
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

// 학부모 포털 결제 요청 — 알림 큐잉만 (Phase 2 실 전송)
export async function requestParentPayment(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const back = String(formData.get("back") ?? "/admin/billing");
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
