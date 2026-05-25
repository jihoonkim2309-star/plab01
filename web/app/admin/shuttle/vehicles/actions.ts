"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";

function rand32(): string {
  // 32-char hex — schema default 와 동일 패턴
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export async function createVehicle(formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const plate = String(formData.get("plate") ?? "").trim() || null;
  const capacityStr = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityStr === "" ? null : Number(capacityStr);
  const memo = String(formData.get("memo") ?? "").trim() || null;
  if (!name) throw new Error("차량 이름은 필수입니다.");
  if (capacity !== null && Number.isNaN(capacity))
    throw new Error("정원은 숫자여야 합니다.");

  const { data, error } = await supabase
    .from("shuttle_vehicles")
    .insert({ center_id: cid, name, plate, capacity, memo })
    .select("id")
    .single();
  if (error) throw error;
  revalidatePath("/admin/shuttle/vehicles");
  redirect(`/admin/shuttle/vehicles/${data.id}`);
}

export async function updateVehicle(id: string, formData: FormData) {
  const { supabase, centerId: cid } = await requireCenter();
  const name = String(formData.get("name") ?? "").trim();
  const plate = String(formData.get("plate") ?? "").trim() || null;
  const capacityStr = String(formData.get("capacity") ?? "").trim();
  const capacity = capacityStr === "" ? null : Number(capacityStr);
  const status = String(formData.get("status") ?? "운영");
  const memo = String(formData.get("memo") ?? "").trim() || null;
  if (!name) throw new Error("차량 이름은 필수입니다.");
  if (capacity !== null && Number.isNaN(capacity))
    throw new Error("정원은 숫자여야 합니다.");

  const { error } = await supabase
    .from("shuttle_vehicles")
    .update({ name, plate, capacity, status, memo })
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath(`/admin/shuttle/vehicles/${id}`);
  revalidatePath("/admin/shuttle/vehicles");
}

export async function deleteVehicle(id: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const { error } = await supabase
    .from("shuttle_vehicles")
    .delete()
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath("/admin/shuttle/vehicles");
  redirect("/admin/shuttle/vehicles");
}

// QR 토큰 재발급 — 분실/노출 시 차량 QR 갈아끼우기. 기존 토큰 무효화.
export async function regenerateQrToken(id: string) {
  const { supabase, centerId: cid } = await requireCenter();
  const token = rand32();
  const { error } = await supabase
    .from("shuttle_vehicles")
    .update({ qr_token: token })
    .eq("id", id)
    .eq("center_id", cid);
  if (error) throw error;
  revalidatePath(`/admin/shuttle/vehicles/${id}`);
}
