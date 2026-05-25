"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";
import { addressToCoords } from "@/lib/kakao";
import { haversineKm, suggestMinutes } from "@/lib/distance";

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

// 새 정류장: 주소 → 좌표 변환, 도착 분 미입력 시 이전 정류장과의 직선거리로 추천.
export async function createStop(routeId: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const estStr = String(formData.get("est_minutes_from_start") ?? "").trim();
  let est: number | null = estStr === "" ? null : Number(estStr);
  if (!name) throw new Error("정류장 이름은 필수입니다.");
  if (est !== null && Number.isNaN(est)) throw new Error("도착 분 형식 오류");

  // 좌표 변환
  const coords = address ? await addressToCoords(address) : null;

  // 다음 sequence + 이전 정류장
  const { data: prev } = await supabase
    .from("shuttle_stops")
    .select("sequence, lat, lng, est_minutes_from_start")
    .eq("route_id", routeId)
    .eq("center_id", cid)
    .order("sequence", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSeq = (prev?.sequence ?? -1) + 1;

  // 자동 추천: 사용자가 분 미입력 + 좌표 둘 다 있을 때
  if (est === null && coords && prev?.lat != null && prev?.lng != null) {
    const km = haversineKm({ lat: prev.lat, lng: prev.lng }, coords);
    const segmentMin = suggestMinutes(km);
    est = (prev.est_minutes_from_start ?? 0) + segmentMin;
  }

  const { error } = await supabase.from("shuttle_stops").insert({
    center_id: cid,
    route_id: routeId,
    sequence: nextSeq,
    name,
    address,
    est_minutes_from_start: est,
    lat: coords?.lat ?? null,
    lng: coords?.lng ?? null,
  });
  if (error) throw error;
  revalidatePath(`/admin/shuttle/routes/${routeId}`);
}

// 정류장 수정: 주소 변경되면 좌표 재변환. 분은 사용자 값 그대로.
export async function updateStop(
  routeId: string,
  stopId: string,
  formData: FormData,
) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim() || null;
  const estStr = String(formData.get("est_minutes_from_start") ?? "").trim();
  const est = estStr === "" ? null : Number(estStr);
  if (!name) throw new Error("정류장 이름은 필수입니다.");
  if (est !== null && Number.isNaN(est)) throw new Error("도착 분 형식 오류");

  // 현재 저장된 주소·좌표
  const { data: cur } = await supabase
    .from("shuttle_stops")
    .select("address, lat, lng")
    .eq("id", stopId)
    .eq("center_id", cid)
    .maybeSingle();

  // 주소 변경 시에만 좌표 재변환 (API 호출 절약)
  let lat = cur?.lat ?? null;
  let lng = cur?.lng ?? null;
  if (address !== (cur?.address ?? null)) {
    const coords = address ? await addressToCoords(address) : null;
    lat = coords?.lat ?? null;
    lng = coords?.lng ?? null;
  }

  const { error } = await supabase
    .from("shuttle_stops")
    .update({ name, address, est_minutes_from_start: est, lat, lng })
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

// 정류장 순서 번호 직접 변경 — 입력한 순서로 이동 + 나머지 자동 재정렬.
export async function setStopSequence(
  routeId: string,
  stopId: string,
  formData: FormData,
) {
  const { supabase, centerId: cid } = await requireCenter();
  const targetStr = String(formData.get("sequence") ?? "").trim();
  const target = Number(targetStr);
  if (!targetStr || Number.isNaN(target) || target < 1) {
    throw new Error("순서는 1 이상 정수여야 합니다.");
  }

  const { data: all } = await supabase
    .from("shuttle_stops")
    .select("id, sequence")
    .eq("route_id", routeId)
    .eq("center_id", cid)
    .order("sequence", { ascending: true });
  if (!all) return;
  const idx = all.findIndex((s) => s.id === stopId);
  if (idx < 0) return;

  const targetIdx = Math.min(Math.max(target - 1, 0), all.length - 1);
  if (targetIdx === idx) return;

  // 배열 재배치
  const reordered = [...all];
  const [moved] = reordered.splice(idx, 1);
  reordered.splice(targetIdx, 0, moved);

  // 새 sequence 0..N-1 부여 (변경된 행만)
  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].sequence !== i) {
      await supabase
        .from("shuttle_stops")
        .update({ sequence: i })
        .eq("id", reordered[i].id)
        .eq("center_id", cid);
    }
  }
  revalidatePath(`/admin/shuttle/routes/${routeId}`);
}
