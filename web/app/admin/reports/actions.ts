"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { buildSnapshot } from "./snapshot";

export async function updateReport(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const coach = String(formData.get("coach_comment") ?? "").trim() || null;
  const admin = String(formData.get("admin_comment") ?? "").trim() || null;
  const pub = formData.get("public_to_parent") === "on";
  const { error } = await supabase
    .from("reports")
    .update({
      coach_comment: coach,
      admin_comment: admin,
      public_to_parent: pub,
    })
    .eq("id", id);
  if (error) throw new Error("저장 실패: " + error.message);
  revalidatePath("/admin/reports");
}

// 발행: 이 시점의 최신 측정값으로 snapshot 다시 빌드해서 저장 → 학부모에게 보이는 동결본.
export async function publishReport(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");

  const { data: r } = await supabase
    .from("reports")
    .select("student_id, report_month")
    .eq("id", id)
    .single();
  if (!r) throw new Error("리포트 없음");

  const { snapshot, measurementId } = await buildSnapshot(
    supabase,
    r.student_id,
    r.report_month,
  );

  const { error } = await supabase
    .from("reports")
    .update({
      status: "발행완료",
      published_at: new Date().toISOString(),
      public_to_parent: true,
      snapshot,
      measurement_id: measurementId,
    })
    .eq("id", id);
  if (error) throw new Error("발행 실패: " + error.message);
  revalidatePath("/admin/reports");
}

export async function unpublishReport(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const { error } = await supabase
    .from("reports")
    .update({
      status: "생성완료",
      published_at: null,
      public_to_parent: false,
    })
    .eq("id", id);
  if (error) throw new Error("발행 취소 실패: " + error.message);
  revalidatePath("/admin/reports");
}

export async function deleteReport(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  const ym = String(formData.get("ym") ?? "");
  if (!id) throw new Error("id 필수");
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/reports");
  redirect(`/admin/reports${ym ? `?ym=${ym}` : ""}`);
}
