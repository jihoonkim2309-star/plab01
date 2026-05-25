"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";

function parseRunForm(formData: FormData) {
  const route_id = String(formData.get("route_id") ?? "").trim() || null;
  const vehicle_id = String(formData.get("vehicle_id") ?? "").trim() || null;
  const driver_user_id = String(formData.get("driver_user_id") ?? "").trim() || null;
  const weekdayStr = String(formData.get("weekday") ?? "").trim();
  const weekday = Number(weekdayStr);
  const start_time = String(formData.get("start_time") ?? "").trim() || null;
  const end_time = String(formData.get("end_time") ?? "").trim() || null;
  const status = String(formData.get("status") ?? "운영");
  if (!route_id) throw new Error("노선은 필수입니다.");
  if (!Number.isInteger(weekday) || weekday < 0 || weekday > 6)
    throw new Error("요일을 선택해 주세요.");
  if (!start_time) throw new Error("출발 시각은 필수입니다.");
  return { route_id, vehicle_id, driver_user_id, weekday, start_time, end_time, status };
}

export async function createRun(formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const payload = parseRunForm(formData);
  const { data, error } = await supabase
    .from("shuttle_runs")
    .insert({ center_id: cid, ...payload })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/shuttle/runs");
  redirect(`/admin/shuttle/runs?run=${data.id}&saved=1`);
}

export async function updateRun(id: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const payload = parseRunForm(formData);
  const { error } = await supabase
    .from("shuttle_runs")
    .update(payload)
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath(`/admin/shuttle/runs`);
  redirect(`/admin/shuttle/runs?run=${id}&saved=1`);
}

export async function deleteRun(id: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const { error } = await supabase
    .from("shuttle_runs")
    .delete()
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/runs");
  redirect("/admin/shuttle/runs");
}
