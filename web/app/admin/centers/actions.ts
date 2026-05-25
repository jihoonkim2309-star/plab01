"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/center";

function parseDay(v: FormDataEntryValue | null, fallback: number) {
  const n = Number(v ?? "");
  if (!Number.isInteger(n) || n < 1 || n > 28) return fallback;
  return n;
}

export async function createCenter(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const contact_phone = String(formData.get("contact_phone") ?? "").trim();
  const business_no = String(formData.get("business_no") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const missing: string[] = [];
  if (!name) missing.push("지점명");
  if (!contact_phone) missing.push("대표 연락처");
  if (!business_no) missing.push("사업자등록번호");
  if (!address) missing.push("주소");
  if (missing.length) {
    redirect("/admin/centers?error=" + encodeURIComponent(`다음 항목이 필요합니다: ${missing.join(", ")}`));
  }
  const payload = {
    name,
    contact_phone,
    business_no,
    address,
    billing_day: parseDay(formData.get("billing_day"), 10),
    report_day: parseDay(formData.get("report_day"), 1),
  };
  const { data: inserted, error } = await supabase.from("centers").insert(payload).select("id").single();
  if (error) {
    redirect("/admin/centers?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/centers");
  redirect(`/admin/centers?center=${inserted.id}&saved=1`);
}

export async function updateCenter(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 누락");
  const name = String(formData.get("name") ?? "").trim();
  const contact_phone = String(formData.get("contact_phone") ?? "").trim();
  const business_no = String(formData.get("business_no") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const missing: string[] = [];
  if (!name) missing.push("지점명");
  if (!contact_phone) missing.push("대표 연락처");
  if (!business_no) missing.push("사업자등록번호");
  if (!address) missing.push("주소");
  if (missing.length) {
    redirect(`/admin/centers/${id}/edit?error=` + encodeURIComponent(`다음 항목이 필요합니다: ${missing.join(", ")}`));
  }
  const payload = {
    name,
    contact_phone,
    business_no,
    address,
    billing_day: parseDay(formData.get("billing_day"), 10),
    report_day: parseDay(formData.get("report_day"), 1),
  };
  const { error } = await supabase
    .from("centers")
    .update(payload)
    .eq("id", id);
  if (error) {
    redirect("/admin/centers?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/centers");
  redirect(`/admin/centers?center=${id}&saved=1`);
}

export async function deleteCenter(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 누락");
  const { error } = await supabase.from("centers").delete().eq("id", id);
  if (error) {
    redirect("/admin/centers?error=" + encodeURIComponent(error.message));
  }
  revalidatePath("/admin/centers");
  redirect("/admin/centers?saved=1");
}
