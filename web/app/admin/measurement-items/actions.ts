"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

const FIELDS = ["category", "name", "unit", "value_kind", "sort_order"] as const;

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

export async function createItem(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.category || !row.name) throw new Error("카테고리·항목명은 필수입니다.");
  const { error } = await supabase
    .from("measurement_items")
    .insert({ ...row, center_id: centerId });
  if (error) throw new Error("등록 실패: " + error.message);
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
  revalidatePath("/admin/measurement-items");
  redirect("/admin/measurement-items");
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
