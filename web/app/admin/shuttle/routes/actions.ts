"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";

export async function createRoute(formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const direction = String(formData.get("direction") ?? "등교");
  const memo = String(formData.get("memo") ?? "").trim() || null;
  if (!name) throw new Error("노선 이름은 필수입니다.");
  const { data, error } = await supabase
    .from("shuttle_routes")
    .insert({ center_id: cid, name, direction, memo })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/shuttle/routes");
  redirect(`/admin/shuttle/routes/${data.id}`);
}

export async function updateRoute(id: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const direction = String(formData.get("direction") ?? "등교");
  const status = String(formData.get("status") ?? "운영");
  const memo = String(formData.get("memo") ?? "").trim() || null;
  if (!name) throw new Error("노선 이름은 필수입니다.");
  const { error } = await supabase
    .from("shuttle_routes")
    .update({ name, direction, status, memo })
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath(`/admin/shuttle/routes/${id}`);
  revalidatePath("/admin/shuttle/routes");
}

export async function deleteRoute(id: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const { error } = await supabase
    .from("shuttle_routes")
    .delete()
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/routes");
  redirect("/admin/shuttle/routes");
}

export async function createStop(routeId: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const estStr = String(formData.get("est_minutes_from_start") ?? "").trim();
  const est = estStr === "" ? null : Number(estStr);
  if (!name) throw new Error("정류장 이름은 필수입니다.");
  if (est !== null && Number.isNaN(est)) throw new Error("도착 분 형식 오류");

  // 다음 sequence = 현재 최대 + 1
  const { data: maxRow } = await supabase
    .from("shuttle_stops")
    .select("sequence")
    .eq("route_id", routeId)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSeq = (maxRow?.sequence ?? -1) + 1;

  const { error } = await supabase.from("shuttle_stops").insert({
    center_id: cid,
    route_id: routeId,
    sequence: nextSeq,
    name,
    address,
    est_minutes_from_start: est,
  });
  if (error) throw error;
  revalidatePath(`/admin/shuttle/routes/${routeId}`);
}

export async function updateStop(routeId: string, stopId: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const estStr = String(formData.get("est_minutes_from_start") ?? "").trim();
  const est = estStr === "" ? null : Number(estStr);
  if (!name) throw new Error("정류장 이름은 필수입니다.");
  if (est !== null && Number.isNaN(est)) throw new Error("도착 분 형식 오류");
  const { error } = await supabase
    .from("shuttle_stops")
    .update({ name, address, est_minutes_from_start: est })
    .eq("id", stopId)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath(`/admin/shuttle/routes/${routeId}`);
}

export async function deleteStop(routeId: string, stopId: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const { error } = await supabase
    .from("shuttle_stops")
    .delete()
    .eq("id", stopId)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath(`/admin/shuttle/routes/${routeId}`);
}

export async function moveStop(
  routeId: string,
  stopId: string,
  dir: "up" | "down",
) {
  const { supabase, centerId: cid } = await requireCenter();
  const { data: all } = await supabase
    .from("shuttle_stops")
    .select("id, sequence")
    .eq("route_id", routeId)
    .eq("center_id", cid)
    .order("sequence", { ascending: true });
  if (!all) return;
  const idx = all.findIndex((s) => s.id === stopId);
  if (idx < 0) return;
  const swap = dir === "up" ? idx - 1 : idx + 1;
  if (swap < 0 || swap >= all.length) return;
  const a = all[idx];
  const b = all[swap];
  // 두 행의 sequence 교환
  await supabase
    .from("shuttle_stops")
    .update({ sequence: b.sequence })
    .eq("id", a.id)
    .eq("center_id", cid);
  await supabase
    .from("shuttle_stops")
    .update({ sequence: a.sequence })
    .eq("id", b.id)
    .eq("center_id", cid);
  revalidatePath(`/admin/shuttle/routes/${routeId}`);
}
