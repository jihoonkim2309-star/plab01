"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";

function parseForm(formData: FormData) {
  const student_id = String(formData.get("student_id") ?? "").trim();
  const route_id = String(formData.get("route_id") ?? "").trim() || null;
  const board_stop_id = String(formData.get("board_stop_id") ?? "").trim() || null;
  const alight_stop_id = String(formData.get("alight_stop_id") ?? "").trim() || null;
  const direction = String(formData.get("direction") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "활성");
  if (!student_id) throw new Error("학생은 필수입니다.");
  return { student_id, route_id, board_stop_id, alight_stop_id, direction, status };
}

export async function createAssignment(formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const payload = parseForm(formData);
  const { data, error } = await supabase
    .from("student_stop_assignments")
    .insert({ center_id: cid, ...payload })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/shuttle/assignments");
  redirect(`/admin/shuttle/assignments?assignment=${data.id}&saved=1`);
}

export async function updateAssignment(id: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const payload = parseForm(formData);
  const { error } = await supabase
    .from("student_stop_assignments")
    .update(payload)
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/assignments");
  redirect(`/admin/shuttle/assignments?assignment=${id}&saved=1`);
}

export async function deleteAssignment(id: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const { error } = await supabase
    .from("student_stop_assignments")
    .delete()
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/assignments");
  redirect("/admin/shuttle/assignments");
}
