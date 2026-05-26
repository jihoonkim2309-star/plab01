"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function updateSettings(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  const bd = Number(formData.get("billing_day") ?? 10);
  const rd = Number(formData.get("report_day") ?? 1);
  // pg_api_secret 은 빈 입력이면 기존 값 유지 (덮어쓰기 방지). 마스킹 패턴.
  const secretInput = String(formData.get("pg_api_secret") ?? "").trim();

  // 진학·승급 처리일 — month/day select 2개를 MM-DD 로 합침. 둘 중 하나라도 비면 null.
  const pm = String(formData.get("promotion_month") ?? "").trim();
  const pd = String(formData.get("promotion_day") ?? "").trim();
  let promotionDay: string | null = null;
  if (pm && pd) {
    const m = Math.min(Math.max(Number(pm), 1), 12);
    const d = Math.min(Math.max(Number(pd), 1), 31);
    promotionDay = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }

  const patch: Record<string, unknown> = {
    name: String(formData.get("name") ?? "") || "플랜비 본점",
    contact_phone: String(formData.get("contact_phone") ?? "") || null,
    business_no: String(formData.get("business_no") ?? "") || null,
    address: String(formData.get("address") ?? "") || null,
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
