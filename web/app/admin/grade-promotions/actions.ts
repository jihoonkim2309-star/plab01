"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function createGradePromotion(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  const student_id = String(formData.get("student_id") ?? "");
  if (!student_id) throw new Error("학생을 선택하세요.");

  const { data: stu } = await supabase
    .from("students")
    .select("grade")
    .eq("id", student_id)
    .single();

  const row = {
    center_id: centerId,
    student_id,
    school_year: String(formData.get("school_year") ?? "") || null,
    from_grade: (stu as { grade: string | null } | null)?.grade ?? null,
    to_grade: String(formData.get("to_grade") ?? "") || null,
    promo_type: String(formData.get("promo_type") ?? "") || null,
    note: String(formData.get("note") ?? "") || null,
  };

  const { error } = await supabase.from("grade_promotions").insert(row);
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/grade-promotions");
  redirect("/admin/grade-promotions");
}

// 상태 변경. '승인 완료' 시 학생의 학년을 to_grade 로 실제 반영.
export async function setGradePromotionStatus(id: string, status: string) {
  const { supabase } = await requireCenter();

  const { data: gp } = await supabase
    .from("grade_promotions")
    .select("student_id, to_grade")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("grade_promotions")
    .update({ status, processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);

  const g = gp as { student_id: string; to_grade: string | null } | null;
  if (status === "승인 완료" && g?.to_grade) {
    await supabase
      .from("students")
      .update({ grade: g.to_grade })
      .eq("id", g.student_id);
  }

  revalidatePath("/admin/grade-promotions");
  redirect(`/admin/grade-promotions?sel=${id}`);
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
