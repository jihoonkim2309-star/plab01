"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { buildSnapshot } from "./snapshot";

// 코멘트만 저장. 발행/공개 상태는 publishReport/unpublishReport 가 일괄 관리.
// 발행 후에도 코멘트 수정 허용 (snapshot 수치만 동결, 코멘트는 사후 편집 가능).
export async function updateReport(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const coach = String(formData.get("coach_comment") ?? "").trim() || null;
  const admin = String(formData.get("admin_comment") ?? "").trim() || null;
  const { error } = await supabase
    .from("reports")
    .update({
      coach_comment: coach,
      admin_comment: admin,
    })
    .eq("id", id);
  if (error) throw new Error("저장 실패: " + error.message);
  revalidatePath("/admin/reports");
}

// 발행: 이 시점의 최신 측정값으로 snapshot 다시 빌드해서 저장 → 학부모에게 보이는 동결본.
export async function publishReport(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
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
    centerId,
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

// 일괄 액션 — 선택한 리포트들 한 번에 처리.
// action: 'publish' | 'unpublish' | 'public_on' | 'public_off'
export async function bulkReportAction(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = String(formData.get("action") ?? "");
  if (ids.length === 0) throw new Error("선택된 리포트가 없습니다.");
  if (!["publish", "unpublish", "public_on", "public_off"].includes(action))
    throw new Error("잘못된 작업");

  if (action === "publish") {
    // 생성완료/생성대기 → 발행완료. snapshot 재빌드. 병렬 처리.
    const { data: rs } = await supabase
      .from("reports")
      .select("id, student_id, report_month, status")
      .eq("center_id", centerId)
      .in("id", ids);
    const rows = (rs ?? []) as {
      id: string;
      student_id: string;
      report_month: string;
      status: string;
    }[];
    const targets = rows.filter((r) => r.status !== "발행완료");
    const nowIso = new Date().toISOString();
    await Promise.all(
      targets.map(async (r) => {
        const { snapshot, measurementId } = await buildSnapshot(
          supabase,
          r.student_id,
          r.report_month,
          centerId,
        );
        const { error } = await supabase
          .from("reports")
          .update({
            status: "발행완료",
            published_at: nowIso,
            public_to_parent: true,
            snapshot,
            measurement_id: measurementId,
          })
          .eq("id", r.id);
        if (error) throw new Error(`발행 실패 (${r.id}): ${error.message}`);
      }),
    );
  } else if (action === "unpublish") {
    const { error } = await supabase
      .from("reports")
      .update({
        status: "생성완료",
        published_at: null,
        public_to_parent: false,
      })
      .eq("center_id", centerId)
      .eq("status", "발행완료")
      .in("id", ids);
    if (error) throw new Error("발행 취소 실패: " + error.message);
  } else if (action === "public_on" || action === "public_off") {
    const { error } = await supabase
      .from("reports")
      .update({ public_to_parent: action === "public_on" })
      .eq("center_id", centerId)
      .in("id", ids);
    if (error) throw new Error("공개 변경 실패: " + error.message);
  }

  revalidatePath("/admin/reports");
}

// 안전한 일괄 액션 — 학생 선택 X, 그 달 생성완료 리포트 전체 발행.
// 각 리포트 snapshot 재빌드 후 발행. toolbar 단일 버튼에서 호출.
export async function publishAllGenerated(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ym = String(formData.get("ym") ?? "");
  if (!ym) throw new Error("리포트 월 필수");

  const { data: rs } = await supabase
    .from("reports")
    .select("id, student_id, report_month")
    .eq("center_id", centerId)
    .eq("report_month", ym)
    .eq("status", "생성완료");

  const rows = (rs ?? []) as {
    id: string;
    student_id: string;
    report_month: string;
  }[];
  if (rows.length === 0) {
    revalidatePath("/admin/reports");
    return;
  }

  const nowIso = new Date().toISOString();
  for (const r of rows) {
    const { snapshot, measurementId } = await buildSnapshot(
      supabase,
      r.student_id,
      r.report_month,
      centerId,
    );
    const { error } = await supabase
      .from("reports")
      .update({
        status: "발행완료",
        published_at: nowIso,
        public_to_parent: true,
        snapshot,
        measurement_id: measurementId,
      })
      .eq("id", r.id);
    if (error) throw new Error(`발행 실패 (${r.id}): ${error.message}`);
  }
  revalidatePath("/admin/reports");
}
