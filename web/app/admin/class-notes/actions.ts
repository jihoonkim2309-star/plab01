"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/center";

// 수업일지 upsert — class_id+note_date unique (어드민·코치 공용)
export async function upsertClassNote(formData: FormData) {
  const { supabase, centerId, userId } = await requireStaff();
  const classId = String(formData.get("class_id") ?? "");
  const noteDate = String(formData.get("note_date") ?? "");
  const content = String(formData.get("content") ?? "").trim();
  const isPublic = formData.get("public_to_parent") === "on";

  if (!classId || !noteDate) throw new Error("필수 정보 누락");
  if (!content) {
    // 빈 내용 = 삭제
    await supabase
      .from("class_notes")
      .delete()
      .eq("class_id", classId)
      .eq("note_date", noteDate);
  } else {
    const { error } = await supabase
      .from("class_notes")
      .upsert(
        {
          center_id: centerId,
          class_id: classId,
          note_date: noteDate,
          content,
          coach_id: userId,
          public_to_parent: isPublic,
        },
        { onConflict: "class_id,note_date" },
      );
    if (error) throw new Error("저장 실패: " + error.message);
  }

  revalidatePath("/admin/class-notes");
  revalidatePath("/admin/attendance");
  revalidatePath("/coach/attendance");
}
