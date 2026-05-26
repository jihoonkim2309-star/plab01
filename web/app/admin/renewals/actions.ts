"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { checkRenewalGate } from "@/lib/renewal";

// 상품이 지정된 학생 중 활성 수강등록(enrollment)이 없는 경우 자동 생성.
export async function syncEnrollments() {
  const { supabase, centerId } = await requireCenter();

  const { data: studs } = await supabase
    .from("students")
    .select("id, class_id, product_id, attendance_days")
    .eq("center_id", centerId)
    .not("product_id", "is", null);

  const { data: existing } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("center_id", centerId)
    .eq("status", "수강중");
  const have = new Set((existing ?? []).map((e) => e.student_id));

  const rows = (studs ?? [])
    .filter((s) => !have.has(s.id))
    .map((s) => ({
      center_id: centerId,
      student_id: s.id,
      class_id: s.class_id,
      product_id: s.product_id,
      attendance_days: s.attendance_days,
      status: "수강중",
    }));

  if (rows.length) {
    const { error } = await supabase.from("enrollments").insert(rows);
    if (error) throw new Error("동기화 실패: " + error.message);
  }
  revalidatePath("/admin/renewals");
  redirect("/admin/renewals");
}

export async function bulkRenewal(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  // 서버 측 게이트 (UI 우회 차단)
  const { data: center } = await supabase
    .from("centers")
    .select("renewal_check_day")
    .eq("id", centerId)
    .maybeSingle();
  const gate = checkRenewalGate(
    (center as { renewal_check_day: number | null } | null)?.renewal_check_day,
  );
  if (gate.state !== "after") {
    throw new Error(
      gate.state === "not-configured"
        ? "다음 달 수강 확인일이 설정되지 않았습니다. 설정에서 먼저 지정하세요."
        : `매월 ${gate.day}일 수강 확인일이 지나야 일괄 처리가 가능합니다 (D-${gate.daysLeft}).`,
    );
  }

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const targetMonth = String(formData.get("target_month") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!targetMonth) throw new Error("대상 월이 없습니다.");
  if (ids.length === 0) throw new Error("선택된 항목이 없습니다.");
  if (!["대기", "확정", "보류"].includes(status))
    throw new Error("잘못된 상태입니다.");

  const rows = ids.map((enrollment_id) => ({
    center_id: centerId,
    enrollment_id,
    target_month: targetMonth,
    status,
    decided_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("renewal_confirmations")
    .upsert(rows, { onConflict: "enrollment_id,target_month" });
  if (error) throw new Error("처리 실패: " + error.message);

  revalidatePath("/admin/renewals");
  redirect(`/admin/renewals?ym=${targetMonth}`);
}
