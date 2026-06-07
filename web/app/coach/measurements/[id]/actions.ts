"use server";

import { revalidatePath } from "next/cache";
import { requirePortal } from "@/lib/portal-auth";

// 학생의 그 달 측정값 저장. 컨테이너 자동 ensure + 항목별 value upsert.
export async function saveMeasurement(formData: FormData) {
  const guard = await requirePortal("coach");
  if (guard.isEmbed) return;
  const { supabase, userId, centerId } = guard;

  const studentId = String(formData.get("student_id") ?? "");
  const month = String(formData.get("month") ?? "");
  if (!studentId || !month) throw new Error("필수 정보 누락");
  if (!centerId) throw new Error("센터 정보 누락");

  // 컨테이너 ensure
  const { data: existing } = await supabase
    .from("measurements")
    .select("id")
    .eq("student_id", studentId)
    .eq("measurement_month", month)
    .maybeSingle();

  let measurementId = (existing as { id?: string } | null)?.id ?? null;
  if (!measurementId) {
    const { data: created, error } = await supabase
      .from("measurements")
      .insert({
        center_id: centerId,
        student_id: studentId,
        measurement_month: month,
        status: "입력완료",
        measured_by: userId,
        measured_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error("컨테이너 생성 실패: " + error.message);
    measurementId = (created as { id: string }).id;
  } else {
    await supabase
      .from("measurements")
      .update({ status: "입력완료", measured_by: userId, measured_at: new Date().toISOString() })
      .eq("id", measurementId);
  }

  // 값 upsert
  type Row = { measurement_id: string; item_id: string; value_num: number | null; value_text: string | null };
  const rows: Row[] = [];
  for (const [key, val] of formData.entries()) {
    if (!key.startsWith("item__")) continue;
    const itemId = key.slice("item__".length);
    const v = String(val).trim();
    if (!v) continue;
    const num = Number(v);
    rows.push({
      measurement_id: measurementId!,
      item_id: itemId,
      value_num: !Number.isNaN(num) ? num : null,
      value_text: Number.isNaN(num) ? v : null,
    });
  }
  if (rows.length > 0) {
    await supabase
      .from("measurement_values")
      .upsert(rows, { onConflict: "measurement_id,item_id" });
  }

  revalidatePath(`/coach/measurements/${studentId}`);
  revalidatePath("/coach/measurements");
  revalidatePath("/admin/measurements");
}
