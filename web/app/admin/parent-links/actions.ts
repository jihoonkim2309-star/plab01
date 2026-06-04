"use server";

import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";

// 학부모 신청에 학생 매칭 + linked.
export async function matchAndLinkStudent(formData: FormData) {
  const linkId = String(formData.get("link_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  if (!linkId || !studentId) throw new Error("필수 정보 누락");

  const { supabase, centerId } = await requireCenter();

  const { error } = await supabase
    .from("parent_student_links")
    .update({ student_id: studentId, status: "linked" })
    .eq("id", linkId)
    .eq("center_id", centerId);
  if (error) throw new Error("매칭 실패: " + error.message);

  revalidatePath("/admin/parent-links");
}
