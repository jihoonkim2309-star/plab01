"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/center";

function calcTotal(plan: string, baseFee: number, perStudent: number, studentCount: number) {
  if (plan === "정액") return baseFee;
  if (plan === "학생수") return perStudent * studentCount;
  return baseFee + perStudent * studentCount; // 혼합
}

// 수동 청구서 발행 — 슈퍼어드민이 특정 지점·기간 선택 → 자동 계산
export async function createHqInvoice(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const center_id = String(formData.get("center_id") ?? "").trim();
  const period = String(formData.get("period") ?? "").trim();
  if (!center_id) throw new Error("지점을 선택해 주세요.");
  if (!/^\d{4}-\d{2}$/.test(period))
    throw new Error("청구 기간은 YYYY-MM 형식이어야 합니다.");

  const { data: center } = await supabase
    .from("centers")
    .select("subscription_plan, subscription_base_fee, subscription_per_student, hq_billing_day")
    .eq("id", center_id)
    .single();
  if (!center) throw new Error("지점을 찾을 수 없습니다.");

  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("center_id", center_id)
    .eq("status", "활성");
  const studentCount = count ?? 0;

  const plan = String(center.subscription_plan ?? "정액");
  const baseFee = Number(center.subscription_base_fee ?? 0);
  const perStudent = Number(center.subscription_per_student ?? 0);
  const total = calcTotal(plan, baseFee, perStudent, studentCount);
  const day = Math.min(Math.max(Number(center.hq_billing_day ?? 1), 1), 28);
  const due_date = `${period}-${String(day).padStart(2, "0")}`;

  const { data, error } = await supabase
    .from("hq_invoices")
    .insert({
      center_id,
      period,
      plan,
      base_fee: baseFee,
      per_student_fee: perStudent,
      student_count: studentCount,
      total,
      status: "청구",
      due_date,
    })
    .select("id")
    .single();
  if (error) {
    redirect("/admin/hq-invoices/new?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/hq-invoices");
  redirect(`/admin/hq-invoices?invoice=${data.id}&saved=1`);
}

export async function markPaid(id: string, formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const method = String(formData.get("method") ?? "").trim() || null;
  const memo = String(formData.get("memo") ?? "").trim() || null;
  const { error } = await supabase
    .from("hq_invoices")
    .update({ status: "결제완료", paid_at: new Date().toISOString(), method, memo })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/hq-invoices");
  redirect(`/admin/hq-invoices?invoice=${id}&saved=1`);
}

export async function setStatus(id: string, status: string) {
  const { supabase } = await requireSuperAdmin();
  const valid = ["청구", "결제완료", "미납", "면제"];
  if (!valid.includes(status)) throw new Error("잘못된 상태");
  const patch: Record<string, unknown> = { status };
  if (status !== "결제완료") patch.paid_at = null;
  const { error } = await supabase.from("hq_invoices").update(patch).eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/hq-invoices");
}

export async function deleteHqInvoice(id: string) {
  const { supabase } = await requireSuperAdmin();
  const { error } = await supabase.from("hq_invoices").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/admin/hq-invoices");
  redirect("/admin/hq-invoices");
}
