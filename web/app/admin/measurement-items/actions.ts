"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 'icon'(이모지 컬럼)은 폼에서 더 이상 입력 받지 않음 → 기존 값은 그대로 보존,
// 새 입력은 icon_url(업로드) 로 받는다.
const FIELDS = [
  "category",
  "name",
  "unit",
  "value_kind",
  "sort_order",
] as const;

function readForm(formData: FormData) {
  const row: Record<string, string | number | boolean | null> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (f === "sort_order") row[f] = v ? Number(v) : 0;
    else row[f] = v === null || v === "" ? null : String(v);
  }
  row.active = formData.get("active") === "on";
  return row;
}

// 폼에 함께 들어온 icon_file 을 Storage 에 올리고 icon_url 을 갱신
async function uploadIconIfPresent(
  supabase: Awaited<ReturnType<typeof requireCenter>>["supabase"],
  itemId: string,
  formData: FormData,
) {
  const file = formData.get("icon_file");
  if (!(file instanceof File) || file.size === 0) return;
  const ext = (file.name.split(".").pop() || "png").toLowerCase();
  const path = `${itemId}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("measurement-item-icons")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return;
  const { data: pub } = supabase.storage
    .from("measurement-item-icons")
    .getPublicUrl(path);
  await supabase
    .from("measurement_items")
    .update({ icon_url: pub.publicUrl })
    .eq("id", itemId);
}

export async function createItem(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.category || !row.name) throw new Error("카테고리·항목명은 필수입니다.");
  const { data: created, error } = await supabase
    .from("measurement_items")
    .insert({ ...row, center_id: centerId })
    .select("id")
    .single();
  if (error) throw new Error("등록 실패: " + error.message);

  if (created?.id) await uploadIconIfPresent(supabase, created.id, formData);

  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
}

export async function updateItem(id: string, formData: FormData) {
  const { supabase } = await requireCenter();
  const row = readForm(formData);
  if (!row.category || !row.name) throw new Error("카테고리·항목명은 필수입니다.");
  const { error } = await supabase
    .from("measurement_items")
    .update(row)
    .eq("id", id);
  if (error) throw new Error("수정 실패: " + error.message);

  await uploadIconIfPresent(supabase, id, formData);

  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
}

export async function removeItemIcon(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("measurement_items")
    .update({ icon_url: null })
    .eq("id", id);
  if (error) throw new Error("아이콘 제거 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
}

export async function deleteItem(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("measurement_items").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
}

export async function seedItems() {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase.rpc("seed_measurement_items", {
    cid: centerId,
  });
  if (error) throw new Error("시드 실패: " + error.message);
  revalidatePath("/admin/measurement-items");
}
