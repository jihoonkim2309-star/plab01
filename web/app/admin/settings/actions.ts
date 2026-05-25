"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function updateSettings(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  const bd = Number(formData.get("billing_day") ?? 10);
  const rd = Number(formData.get("report_day") ?? 1);

  const { error } = await supabase
    .from("centers")
    .update({
      name: String(formData.get("name") ?? "") || "플랜비 본점",
      contact_phone: String(formData.get("contact_phone") ?? "") || null,
      business_no: String(formData.get("business_no") ?? "") || null,
      address: String(formData.get("address") ?? "") || null,
      billing_day: Math.min(Math.max(bd, 1), 28),
      report_day: Math.min(Math.max(rd, 1), 28),
      notify_enabled: formData.get("notify_enabled") === "on",
      pg_mode: String(formData.get("pg_mode") ?? "test"),
      pg_store_id: String(formData.get("pg_store_id") ?? "") || null,
      pg_channel_key: String(formData.get("pg_channel_key") ?? "") || null,
      pg_api_secret: String(formData.get("pg_api_secret") ?? "") || null,
    })
    .eq("id", centerId);
  if (error) throw new Error("저장 실패: " + error.message);

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
