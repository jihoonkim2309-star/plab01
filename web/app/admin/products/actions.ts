"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

function readForm(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    kind: String(formData.get("kind") ?? "정규반"),
    sessions_per_week: formData.get("sessions_per_week")
      ? Number(formData.get("sessions_per_week"))
      : null,
    price: Number(formData.get("price") ?? 0) || 0,
    billing_cycle: String(formData.get("billing_cycle") ?? "월"),
    active: formData.get("active") === "on",
  };
}

export async function createProduct(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.name) throw new Error("상품명은 필수입니다.");
  const { error } = await supabase
    .from("products")
    .insert({ ...row, center_id: centerId });
  if (error) throw new Error("등록 실패: " + error.message);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function updateProduct(id: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.name) throw new Error("상품명은 필수입니다.");
  const { error } = await supabase
    .from("products")
    .update(row)
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("수정 실패: " + error.message);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}

export async function deleteProduct(id: string) {
  const { supabase, centerId } = await requireCenter();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}
