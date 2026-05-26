"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { nextGrade, promoMeta, checkPromotionGate } from "@/lib/promotion";
import type { SupabaseClient } from "@supabase/supabase-js";

// 승인 완료 시 학생 학년(+학교) 실제 반영
async function applyToStudent(
  supabase: SupabaseClient,
  centerId: string,
  promoId: string,
) {
  const { data } = await supabase
    .from("grade_promotions")
    .select("student_id, to_grade, to_school")
    .eq("center_id", centerId)
    .eq("id", promoId)
    .single();
  const g = data as {
    student_id: string;
    to_grade: string | null;
    to_school: string | null;
  } | null;
  if (!g) return;
  const patch: Record<string, string> = {};
  if (g.to_grade) patch.grade = g.to_grade;
  if (g.to_school) patch.school = g.to_school;
  if (Object.keys(patch).length)
    await supabase
      .from("students")
      .update(patch)
      .eq("center_id", centerId)
      .eq("id", g.student_id);
}

// 학생 다중선택 → 승급 대상 일괄 생성
export async function bulkCreateGradePromotions(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  // 서버 측 처리일 가드 (UI 우회 차단)
  const { data: center } = await supabase
    .from("centers")
    .select("promotion_day")
    .eq("id", centerId)
    .maybeSingle();
  const gate = checkPromotionGate(
    (center as { promotion_day: string | null } | null)?.promotion_day,
  );
  if (gate.state !== "after") {
    throw new Error(
      gate.state === "not-configured"
        ? "승급 처리일이 설정되지 않았습니다. 설정에서 먼저 지정하세요."
        : `처리일(${gate.targetDate}) 이전입니다. D-${gate.daysLeft}.`,
    );
  }

  const ids = formData.getAll("student_ids").map(String).filter(Boolean);
  const schoolYear = String(formData.get("school_year") ?? "") || null;
  if (ids.length === 0) throw new Error("학생을 한 명 이상 선택하세요.");

  const { data: studs } = await supabase
    .from("students")
    .select("id, grade")
    .eq("center_id", centerId)
    .in("id", ids);

  const rows: Array<Record<string, unknown>> = [];
  for (const s of studs ?? []) {
    const stud = s as { id: string; grade: string | null };
    const to = nextGrade(stud.grade);
    if (!to) continue; // 졸업/대상 아님 → 행 생성 안 함
    const meta = promoMeta(to);
    rows.push({
      center_id: centerId,
      student_id: stud.id,
      school_year: schoolYear,
      from_grade: stud.grade ?? null,
      to_grade: to,
      to_school: meta.needsParentInput ? null : null, // 학부모/어드민이 입력 예정
      promo_type: meta.type,
      needs_parent_input: meta.needsParentInput,
      status: meta.needsParentInput ? "학부모 입력 요청" : "진학 확인 필요",
    });
  }
  if (rows.length === 0) {
    throw new Error("승급 대상에 해당하는 학생이 없습니다 (모두 졸업/대상 아님).");
  }

  const { error } = await supabase.from("grade_promotions").insert(rows);
  if (error) throw new Error("일괄 생성 실패: " + error.message);

  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}

// 관리자가 새 학교/메모 직접 입력(학부모 대행)
export async function updatePromotionDetail(id: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("grade_promotions")
    .update({
      to_school: String(formData.get("to_school") ?? "") || null,
      to_grade: String(formData.get("to_grade") ?? "") || null,
      note: String(formData.get("note") ?? "") || null,
    })
    .eq("center_id", centerId)
    .eq("id", id);
  if (error) throw new Error("저장 실패: " + error.message);
  revalidatePath("/admin/grade-promotions");
  redirect(`/admin/grade-promotions?sel=${id}`);
}

export async function setGradePromotionStatus(id: string, status: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("grade_promotions")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("center_id", centerId)
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);
  if (status === "승인 완료") await applyToStudent(supabase, centerId, id);

  revalidatePath("/admin/grade-promotions");
  redirect(`/admin/grade-promotions?sel=${id}`);
}

export async function bulkSetStatus(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const status = String(formData.get("status") ?? "");
  if (ids.length === 0 || !status) throw new Error("선택된 항목이 없습니다.");

  const { error } = await supabase
    .from("grade_promotions")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("center_id", centerId)
    .in("id", ids);
  if (error) throw new Error("일괄 처리 실패: " + error.message);

  if (status === "승인 완료") {
    for (const id of ids) await applyToStudent(supabase, centerId, id);
  }

  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}

export async function deleteGradePromotion(id: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("grade_promotions")
    .delete()
    .eq("center_id", centerId)
    .eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}
