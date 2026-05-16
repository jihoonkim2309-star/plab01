"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function createMakeup(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const class_id = String(formData.get("class_id") ?? "");
  if (!class_id) throw new Error("클래스를 선택하세요.");

  const { error } = await supabase.from("makeups").insert({
    center_id: centerId,
    class_id,
    original_date: String(formData.get("original_date") ?? "") || null,
    makeup_date: String(formData.get("makeup_date") ?? "") || null,
    reason: String(formData.get("reason") ?? "") || null,
  });
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/makeups");
  redirect("/admin/makeups");
}

export async function setMakeupStatus(id: string, status: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("makeups")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);
  revalidatePath("/admin/makeups");
  redirect("/admin/makeups");
}

export async function deleteMakeup(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("makeups").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/makeups");
  redirect("/admin/makeups");
}
