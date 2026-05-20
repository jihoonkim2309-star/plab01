"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { buildSnapshot } from "./snapshot";

// 그 달 측정 승인완료 학생당 "월간" 리포트 행 생성/존재 보장.
// snapshot은 발행 전엔 미리보기에서 라이브로 그려지므로 여기선 placeholder만 넣어도 되지만,
// 학부모 포털 등 비라이브 surface 대비해 일단 빌드해서 저장. 발행 시점에 다시 갱신함.
// 구버전 4종 리포트(신체성장/기록/체력측정/배드민턴측정)는 정리(발행완료는 보존).
export async function generateReportsForMonth(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ym = String(formData.get("ym") ?? "");
  if (!ym) throw new Error("측정월 필수");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 구버전 리포트 정리 (발행완료가 아닌 것만)
  await supabase
    .from("reports")
    .delete()
    .eq("center_id", centerId)
    .eq("report_month", ym)
    .in("report_type", ["신체성장", "기록", "체력측정", "배드민턴측정"])
    .neq("status", "발행완료");

  const { data: approved } = await supabase
    .from("measurements")
    .select("id, student_id")
    .eq("center_id", centerId)
    .eq("measurement_month", ym)
    .eq("status", "승인완료");

  if (!approved || approved.length === 0) {
    // 승인된 측정 없음 → 조용히 종료
    revalidatePath("/admin/reports");
    return;
  }

  // 기존 "월간" 리포트
  const { data: existing } = await supabase
    .from("reports")
    .select("id, student_id, status")
    .eq("center_id", centerId)
    .eq("report_month", ym)
    .eq("report_type", "월간");
  const existingByStudent = new Map(
    (existing ?? []).map((r) => [r.student_id, r]),
  );

  for (const m of approved) {
    const ex = existingByStudent.get(m.student_id);
    // 이미 발행완료된 리포트는 손대지 않음 (frozen)
    if (ex?.status === "발행완료") continue;

    const { snapshot } = await buildSnapshot(supabase, m.student_id, ym);
    if (ex) {
      const { error } = await supabase
        .from("reports")
        .update({ snapshot, measurement_id: m.id, status: "생성완료" })
        .eq("id", ex.id);
      if (error) throw new Error("리포트 갱신 실패: " + error.message);
    } else {
      const { error } = await supabase.from("reports").insert({
        center_id: centerId,
        student_id: m.student_id,
        measurement_id: m.id,
        report_month: ym,
        report_type: "월간",
        status: "생성완료",
        snapshot,
        generated_by: user?.id ?? null,
      });
      if (error) throw new Error("리포트 생성 실패: " + error.message);
    }
  }
  revalidatePath("/admin/reports");
}

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
