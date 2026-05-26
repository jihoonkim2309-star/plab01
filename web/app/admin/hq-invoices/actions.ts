"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/center";
import { logAudit } from "@/lib/audit";

function calcTotal(
  plan: string,
  baseFee: number,
  perStudent: number,
  studentCount: number,
  revenueBase: number,
  revenuePct: number,
) {
  if (plan === "정액") return baseFee;
  if (plan === "학생수") return perStudent * studentCount;
  if (plan === "매출비례") return Math.round((revenueBase * revenuePct) / 100);
  return baseFee + perStudent * studentCount; // 레거시 호환
}

function prevPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1); // m=1-indexed, getMonth=0-indexed → m-2 = 전월의 0-indexed
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
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
    .select("subscription_plan, subscription_base_fee, subscription_per_student, subscription_revenue_pct, hq_billing_day")
    .eq("id", center_id)
    .single();
  if (!center) throw new Error("지점을 찾을 수 없습니다.");

  const { count } = await supabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("center_id", center_id)
    .eq("status", "정상");
  const studentCount = count ?? 0;

  const plan = String(center.subscription_plan ?? "정액");
  const baseFee = Number(center.subscription_base_fee ?? 0);
  const perStudent = Number(center.subscription_per_student ?? 0);
  const revenuePct = Number(center.subscription_revenue_pct ?? 0);

  // 매출비례 시 전월 매출 (지점 invoice 결제완료 합계)
  let revenueBase = 0;
  if (plan === "매출비례") {
    const { data: revRows } = await supabase
      .from("invoices")
      .select("amount")
      .eq("center_id", center_id)
      .eq("period", prevPeriod(period))
      .eq("status", "결제완료");
    revenueBase = (revRows ?? []).reduce((a, b) => a + Number(b.amount ?? 0), 0);
  }

  const total = calcTotal(plan, baseFee, perStudent, studentCount, revenueBase, revenuePct);
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
      revenue_base: revenueBase,
      revenue_pct: revenuePct,
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
  const { data: prev } = await supabase
    .from("hq_invoices")
    .select("center_id, total, period")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase
    .from("hq_invoices")
    .update({ status: "결제완료", paid_at: new Date().toISOString(), method, memo })
    .eq("id", id);
  if (error) throw error;
  if (prev?.center_id) {
    await logAudit(supabase, {
      center_id: prev.center_id,
      action: "hq_invoice.mark_paid",
      target_table: "hq_invoices",
      target_id: id,
      detail: { period: prev.period, total: prev.total, method, memo },
    });
  }
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
  const { data: prev } = await supabase
    .from("hq_invoices")
    .select("center_id, period, total, status")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("hq_invoices").delete().eq("id", id);
  if (error) throw error;
  if (prev?.center_id) {
    await logAudit(supabase, {
      center_id: prev.center_id,
      action: "hq_invoice.delete",
      target_table: "hq_invoices",
      target_id: id,
      detail: { period: prev.period, total: prev.total, status: prev.status },
    });
  }
  revalidatePath("/admin/hq-invoices");
  redirect("/admin/hq-invoices");
}
