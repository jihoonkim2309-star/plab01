"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function updateSettings(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  // 필수값 검증 — 하나라도 비면 redirect 로 안내
  const name = String(formData.get("name") ?? "").trim();
  const contactPhone = String(formData.get("contact_phone") ?? "").trim();
  const businessNo = String(formData.get("business_no") ?? "").trim();
  const address = String(formData.get("address") ?? "").trim();
  const bdRaw = String(formData.get("billing_day") ?? "").trim();
  const rdRaw = String(formData.get("report_day") ?? "").trim();
  const pm = String(formData.get("promotion_month") ?? "").trim();
  const pd = String(formData.get("promotion_day") ?? "").trim();

  if (!name) redirect("/admin/settings?error=name");
  if (!contactPhone) redirect("/admin/settings?error=contact_phone");
  if (!businessNo) redirect("/admin/settings?error=business_no");
  if (!address) redirect("/admin/settings?error=address");
  if (!bdRaw) redirect("/admin/settings?error=billing_day");
  if (!rdRaw) redirect("/admin/settings?error=report_day");
  if (!pm || !pd) redirect("/admin/settings?error=promotion_day");

  const bd = Number(bdRaw);
  const rd = Number(rdRaw);
  // pg_api_secret 은 빈 입력이면 기존 값 유지 (덮어쓰기 방지). 마스킹 패턴.
  const secretInput = String(formData.get("pg_api_secret") ?? "").trim();

  const mm = Math.min(Math.max(Number(pm), 1), 12);
  const dd = Math.min(Math.max(Number(pd), 1), 31);
  const promotionDay = `${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;

  const patch: Record<string, unknown> = {
    name,
    contact_phone: contactPhone,
    business_no: businessNo,
    address,
    billing_day: Math.min(Math.max(bd, 1), 28),
    report_day: Math.min(Math.max(rd, 1), 28),
    promotion_day: promotionDay,
    notify_enabled: formData.get("notify_enabled") === "on",
    pg_mode: String(formData.get("pg_mode") ?? "test"),
    pg_store_id: String(formData.get("pg_store_id") ?? "") || null,
    pg_channel_key: String(formData.get("pg_channel_key") ?? "") || null,
  };
  if (secretInput) patch.pg_api_secret = secretInput;

  const { error } = await supabase
    .from("centers")
    .update(patch)
    .eq("id", centerId);
  if (error) throw new Error("저장 실패: " + error.message);

  revalidatePath("/admin/settings");
  redirect("/admin/settings?saved=1");
}
