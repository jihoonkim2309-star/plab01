"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { REPORT_TYPES, TYPE_CATEGORIES, type ReportType } from "./types";

type Supa = Awaited<ReturnType<typeof requireCenter>>["supabase"];

type SnapshotItem = {
  name: string;
  unit: string | null;
  value: number | string | null;
};
type SnapshotSection = { title: string; items: SnapshotItem[] };
type Snapshot = {
  student: {
    id: string;
    name: string | null;
    gender: string | null;
    birth: string | null;
    school: string | null;
    grade: string | null;
  };
  measurement_month: string;
  report_type: ReportType;
  sections: SnapshotSection[];
};

async function buildSnapshot(
  supabase: Supa,
  studentId: string,
  ym: string,
  type: ReportType,
): Promise<{ snapshot: Snapshot; measurementId: string | null }> {
  const { data: student } = await supabase
    .from("students")
    .select("id, name, gender, birth, school, grade")
    .eq("id", studentId)
    .single();

  const { data: m } = await supabase
    .from("measurements")
    .select("id")
    .eq("student_id", studentId)
    .eq("measurement_month", ym)
    .maybeSingle();

  const { data: items } = await supabase
    .from("measurement_items")
    .select("id, category, name, unit, sort_order, active")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const values = m
    ? (
        await supabase
          .from("measurement_values")
          .select("item_id, value_num, value_text")
          .eq("measurement_id", m.id)
      ).data ?? []
    : [];
  const valById = new Map(values.map((v) => [v.item_id, v]));

  const cats = TYPE_CATEGORIES[type];
  const sections: SnapshotSection[] = [];
  for (const cat of cats) {
    const itemsInCat = (items ?? []).filter((i) => i.category === cat);
    if (itemsInCat.length === 0) continue;
    sections.push({
      title: cat,
      items: itemsInCat.map((i) => {
        const v = valById.get(i.id);
        const value =
          v?.value_num != null ? v.value_num : (v?.value_text ?? null);
        return { name: i.name, unit: i.unit ?? null, value };
      }),
    });
  }

  const snapshot: Snapshot = {
    student: student ?? {
      id: studentId,
      name: null,
      gender: null,
      birth: null,
      school: null,
      grade: null,
    },
    measurement_month: ym,
    report_type: type,
    sections,
  };
  return { snapshot, measurementId: m?.id ?? null };
}

// 그 달 측정 승인완료 학생에 대해 누락된 (학생×유형) 리포트 행을 일괄 생성
export async function generateReportsForMonth(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ym = String(formData.get("ym") ?? "");
  if (!ym) throw new Error("측정월 필수");

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: approved } = await supabase
    .from("measurements")
    .select("id, student_id")
    .eq("center_id", centerId)
    .eq("measurement_month", ym)
    .eq("status", "승인완료");

  if (!approved || approved.length === 0) {
    throw new Error("이 달에 승인 완료된 측정이 없습니다.");
  }

  const { data: existing } = await supabase
    .from("reports")
    .select("student_id, report_type")
    .eq("center_id", centerId)
    .eq("report_month", ym);
  const have = new Set(
    (existing ?? []).map((r) => `${r.student_id}|${r.report_type}`),
  );

  let inserted = 0;
  for (const m of approved) {
    for (const type of REPORT_TYPES) {
      if (have.has(`${m.student_id}|${type}`)) continue;
      const { snapshot } = await buildSnapshot(
        supabase,
        m.student_id,
        ym,
        type,
      );
      const { error } = await supabase.from("reports").insert({
        center_id: centerId,
        student_id: m.student_id,
        measurement_id: m.id,
        report_month: ym,
        report_type: type,
        status: "생성완료",
        snapshot,
        generated_by: user?.id ?? null,
      });
      if (error) throw new Error("리포트 생성 실패: " + error.message);
      inserted += 1;
    }
  }
  void inserted;
  revalidatePath("/admin/reports");
}

// 단일 리포트 snapshot 재생성 (최신 측정값 반영)
export async function regenerateSnapshot(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const { data: r } = await supabase
    .from("reports")
    .select("student_id, report_month, report_type")
    .eq("id", id)
    .single();
  if (!r) throw new Error("리포트 없음");
  const { snapshot, measurementId } = await buildSnapshot(
    supabase,
    r.student_id,
    r.report_month,
    r.report_type as ReportType,
  );
  const { error } = await supabase
    .from("reports")
    .update({
      snapshot,
      measurement_id: measurementId,
      status: "생성완료",
    })
    .eq("id", id);
  if (error) throw new Error("재생성 실패: " + error.message);
  revalidatePath("/admin/reports");
}

// 코멘트/공개 옵션 저장
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

export async function publishReport(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const { error } = await supabase
    .from("reports")
    .update({
      status: "발행완료",
      published_at: new Date().toISOString(),
      public_to_parent: true,
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
