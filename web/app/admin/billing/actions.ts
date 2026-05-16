"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

const pad = (n: number) => String(n).padStart(2, "0");

// 해당 월 '확정' 수강건 → 청구서 생성 (이미 있으면 건너뜀)
export async function generateInvoices(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const period = String(formData.get("period") ?? "");
  if (!/^\d{4}-\d{2}$/.test(period)) throw new Error("대상 월이 올바르지 않습니다.");

  const { data: center } = await supabase
    .from("centers")
    .select("billing_day")
    .eq("id", centerId)
    .single();
  const billingDay = (center as { billing_day: number } | null)?.billing_day ?? 10;
  const dueDate = `${period}-${pad(Math.min(billingDay, 28))}`;

  const { data: confirmed } = await supabase
    .from("renewal_confirmations")
    .select("enrollment_id, enrollments(student_id, products(name, price))")
    .eq("target_month", period)
    .eq("status", "확정");

  const rows = (confirmed ?? []) as unknown as {
    enrollment_id: string;
    enrollments: {
      student_id: string;
      products: { name: string; price: number } | null;
    } | null;
  }[];

  const { data: exist } = await supabase
    .from("invoices")
    .select("student_id")
    .eq("period", period);
  const billed = new Set((exist ?? []).map((i) => i.student_id));

  let created = 0;
  for (const r of rows) {
    const e = r.enrollments;
    if (!e || billed.has(e.student_id)) continue;
    const amount = e.products?.price ?? 0;
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        center_id: centerId,
        student_id: e.student_id,
        period,
        amount,
        status: "청구",
        source: "수강확인",
        due_date: dueDate,
        issued_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error("청구 생성 실패: " + error.message);
    await supabase.from("invoice_items").insert({
      center_id: centerId,
      invoice_id: (inv as { id: string }).id,
      enrollment_id: r.enrollment_id,
      label: e.products?.name ?? "수강료",
      amount,
    });
    billed.add(e.student_id);
    created++;
  }

  revalidatePath("/admin/billing");
  redirect(`/admin/billing?ym=${period}&created=${created}`);
}

export async function bulkInvoiceStatus(formData: FormData) {
  const { supabase } = await requireCenter();
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
    .in("id", ids);
  if (error) throw new Error("처리 실패: " + error.message);

  revalidatePath("/admin/billing");
  redirect(`/admin/billing?ym=${period}`);
}

export async function deleteInvoice(id: string, period: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/billing");
  redirect(`/admin/billing?ym=${period}`);
}
