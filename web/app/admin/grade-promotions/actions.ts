"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { nextGrade, promoMeta } from "@/lib/promotion";
import type { SupabaseClient } from "@supabase/supabase-js";

// 승인 완료 시 학생 학년(+학교) 실제 반영
async function applyToStudent(
  supabase: SupabaseClient,
  promoId: string,
) {
  const { data } = await supabase
    .from("grade_promotions")
    .select("student_id, to_grade, to_school")
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
    await supabase.from("students").update(patch).eq("id", g.student_id);
}

// 학생 다중선택 → 승급 대상 일괄 생성
export async function bulkCreateGradePromotions(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ids = formData.getAll("student_ids").map(String).filter(Boolean);
  const schoolYear = String(formData.get("school_year") ?? "") || null;
  if (ids.length === 0) throw new Error("학생을 한 명 이상 선택하세요.");

  const { data: studs } = await supabase
    .from("students")
    .select("id, grade")
    .in("id", ids);

  const rows = (studs ?? []).map((s) => {
    const to = nextGrade((s as { grade: string | null }).grade);
    const meta = promoMeta(to);
    return {
      center_id: centerId,
      student_id: (s as { id: string }).id,
      school_year: schoolYear,
      from_grade: (s as { grade: string | null }).grade ?? null,
      to_grade: to,
      promo_type: to ? meta.type : null,
      needs_parent_input: meta.needsParentInput,
      status: to ? "학부모 입력 요청" : "진학 확인 필요",
    };
  });

  const { error } = await supabase.from("grade_promotions").insert(rows);
  if (error) throw new Error("일괄 생성 실패: " + error.message);

  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}

// 관리자가 새 학교/메모 직접 입력(학부모 대행)
export async function updatePromotionDetail(id: string, formData: FormData) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("grade_promotions")
    .update({
      to_school: String(formData.get("to_school") ?? "") || null,
      to_grade: String(formData.get("to_grade") ?? "") || null,
      note: String(formData.get("note") ?? "") || null,
    })
    .eq("id", id);
  if (error) throw new Error("저장 실패: " + error.message);
  revalidatePath("/admin/grade-promotions");
  redirect(`/admin/grade-promotions?sel=${id}`);
}

export async function setGradePromotionStatus(id: string, status: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("grade_promotions")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);
  if (status === "승인 완료") await applyToStudent(supabase, id);

  revalidatePath("/admin/grade-promotions");
  redirect(`/admin/grade-promotions?sel=${id}`);
}

export async function bulkSetStatus(formData: FormData) {
  const { supabase } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const status = String(formData.get("status") ?? "");
  if (ids.length === 0 || !status) throw new Error("선택된 항목이 없습니다.");

  const { error } = await supabase
    .from("grade_promotions")
    .update({ status, processed_at: new Date().toISOString() })
    .in("id", ids);
  if (error) throw new Error("일괄 처리 실패: " + error.message);

  if (status === "승인 완료") {
    for (const id of ids) await applyToStudent(supabase, id);
  }

  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}

export async function deleteGradePromotion(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("grade_promotions")
    .delete()
    .eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}
