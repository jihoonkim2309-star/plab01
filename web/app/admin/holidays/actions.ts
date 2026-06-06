"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function createHoliday(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const holiday_date = String(formData.get("holiday_date") ?? "");
  if (!holiday_date) throw new Error("휴강일을 선택하세요.");

  const classId = String(formData.get("class_id") ?? "");
  const { error } = await supabase.from("holidays").insert({
    center_id: centerId,
    holiday_date,
    reason: String(formData.get("reason") ?? "") || null,
    class_id: classId || null,
    notify: formData.get("notify") === "on",
  });
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/holidays");
  redirect("/admin/holidays");
}

export async function deleteHoliday(id: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/holidays");
  redirect("/admin/holidays");
}
