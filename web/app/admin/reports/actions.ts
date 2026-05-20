"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import {
  REPORT_CATEGORIES,
  CATEGORY_TITLES,
  REPORT_TYPES,
  type ReportType,
} from "./types";

type Supa = Awaited<ReturnType<typeof requireCenter>>["supabase"];

type TrendCell = number | string | null;
export type SnapshotTrendItem = {
  name: string;
  unit: string | null;
  category: string;
  icon: string | null;
  values: [TrendCell, TrendCell, TrendCell, TrendCell]; // -3, -2, -1, 0
  change_abs: number | null;
  change_pct: number | null;
};
export type SnapshotSection = {
  category: string;
  title: string;
  items: SnapshotTrendItem[];
};
export type BalanceScores = {
  파워: number;
  스피드: number;
  민첩성: number;
  균형성: number;
  협응성: number;
};

export type Snapshot = {
  student: {
    id: string;
    name: string | null;
    gender: string | null;
    birth: string | null;
    school: string | null;
    grade: string | null;
  };
  measurement_month: string;
  months: [string, string, string, string]; // YYYY-MM
  month_dates: [string, string, string, string]; // YYYY.MM.DD (표시용)
  sections: SnapshotSection[];
  balance: BalanceScores;
};

// 항목별 원값을 0-100 점수로 정규화. 연령대별 기준은 데이터 확보 전 임시 평균치 사용.
const HIGHER_BETTER: Record<string, { min: number; max: number }> = {
  "제자리 멀리뛰기": { min: 100, max: 220 }, // cm
  "수직 점프": { min: 20, max: 55 }, // cm
  "스텝 테스트": { min: 30, max: 90 }, // 회
  "라켓 컨트롤": { min: 10, max: 60 }, // 회
  정확도: { min: 40, max: 100 }, // %
  골격근량: { min: 10, max: 30 }, // kg (아동 기준)
};
const LOWER_BETTER: Record<string, { good: number; bad: number }> = {
  "20m 달리기": { good: 3.0, bad: 5.0 }, // sec
  반응속도: { good: 0.3, bad: 0.85 }, // sec
};
function scoreItem(name: string, value: number): number | null {
  const h = HIGHER_BETTER[name];
  if (h)
    return Math.max(
      0,
      Math.min(100, Math.round(((value - h.min) / (h.max - h.min)) * 100)),
    );
  const l = LOWER_BETTER[name];
  if (l)
    return Math.max(
      0,
      Math.min(100, Math.round(((l.bad - value) / (l.bad - l.good)) * 100)),
    );
  return null;
}
function avgOfScores(...scores: (number | null)[]): number {
  const valid = scores.filter((x): x is number => x != null);
  if (valid.length === 0) return 0;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
function computeBalance(currentByName: Record<string, number>): BalanceScores {
  const s = (name: string) => {
    const v = currentByName[name];
    return v != null ? scoreItem(name, v) : null;
  };
  return {
    파워: avgOfScores(s("제자리 멀리뛰기"), s("수직 점프")),
    스피드: avgOfScores(s("20m 달리기"), s("반응속도")),
    민첩성: avgOfScores(s("스텝 테스트"), s("반응속도"), s("20m 달리기")),
    균형성: avgOfScores(s("골격근량"), s("수직 점프")),
    협응성: avgOfScores(s("라켓 컨트롤"), s("정확도"), s("스텝 테스트")),
  };
}

const pad = (n: number) => String(n).padStart(2, "0");

function prevMonths(ym: string): [string, string, string, string] {
  const [y, m] = ym.split("-").map(Number);
  const list: string[] = [];
  for (let i = -3; i <= 0; i++) {
    const d = new Date(y, m - 1 + i, 1);
    list.push(`${d.getFullYear()}-${pad(d.getMonth() + 1)}`);
  }
  return list as [string, string, string, string];
}

async function buildSnapshot(
  supabase: Supa,
  studentId: string,
  ym: string,
): Promise<{ snapshot: Snapshot; measurementId: string | null }> {
  const months = prevMonths(ym);

  const { data: student } = await supabase
    .from("students")
    .select("id, name, gender, birth, school, grade")
    .eq("id", studentId)
    .single();

  // 4개월치 measurement 가져오기
  const { data: ms } = await supabase
    .from("measurements")
    .select("id, measurement_month, measured_at")
    .eq("student_id", studentId)
    .in("measurement_month", months);
  const msByMonth = new Map<
    string,
    { id: string; measurement_month: string; measured_at: string | null }
  >((ms ?? []).map((m) => [m.measurement_month, m]));
  const currentM = msByMonth.get(ym) ?? null;

  // 활성 항목 가져오기
  const { data: items } = await supabase
    .from("measurement_items")
    .select("id, category, name, unit, icon, sort_order, active")
    .eq("active", true)
    .in("category", REPORT_CATEGORIES)
    .order("sort_order", { ascending: true });

  // 4개월치 값 가져오기 (있는 measurement만)
  const mids = (ms ?? []).map((m) => m.id);
  const { data: vals } = mids.length
    ? await supabase
        .from("measurement_values")
        .select("measurement_id, item_id, value_num, value_text")
        .in("measurement_id", mids)
    : { data: [] };

  // index by (month_idx, item_id)
  const valByMonthItem = new Map<string, TrendCell>();
  for (const v of vals ?? []) {
    const monthEntry = (ms ?? []).find((m) => m.id === v.measurement_id);
    if (!monthEntry) continue;
    const idx = months.indexOf(monthEntry.measurement_month);
    if (idx < 0) continue;
    const cell: TrendCell = v.value_num != null ? Number(v.value_num) : (v.value_text ?? null);
    valByMonthItem.set(`${idx}|${v.item_id}`, cell);
  }

  // 표시용 날짜 (YYYY.MM.DD): measured_at 있으면 사용, 없으면 YYYY.MM.01
  const monthDates = months.map((m) => {
    const me = msByMonth.get(m);
    if (me?.measured_at) {
      return me.measured_at.slice(0, 10).replace(/-/g, ".");
    }
    return `${m.replace("-", ".")}.--`;
  }) as [string, string, string, string];

  // 섹션 빌드
  const sections: SnapshotSection[] = REPORT_CATEGORIES.map((cat) => {
    const itemsInCat = (items ?? []).filter((i) => i.category === cat);
    return {
      category: cat,
      title: CATEGORY_TITLES[cat] ?? cat,
      items: itemsInCat.map((it) => {
        const v0 = valByMonthItem.get(`3|${it.id}`) ?? null;
        const v1 = valByMonthItem.get(`2|${it.id}`) ?? null;
        const v2 = valByMonthItem.get(`1|${it.id}`) ?? null;
        const v3 = valByMonthItem.get(`0|${it.id}`) ?? null;
        // change: 현재 - (가장 오래된 가용값)
        const baseline =
          [v3, v2, v1].find((x): x is number => typeof x === "number") ?? null;
        const cur = typeof v0 === "number" ? v0 : null;
        let change_abs: number | null = null;
        let change_pct: number | null = null;
        if (cur != null && baseline != null && baseline !== 0) {
          change_abs = +(cur - baseline).toFixed(2);
          change_pct = +(((cur - baseline) / baseline) * 100).toFixed(1);
        }
        return {
          name: it.name,
          unit: it.unit ?? null,
          category: it.category,
          icon: it.icon ?? null,
          values: [v3, v2, v1, v0] as [TrendCell, TrendCell, TrendCell, TrendCell],
          change_abs,
          change_pct,
        };
      }),
    };
  }).filter((s) => s.items.length > 0);

  // 현재 달 항목별 값 (이름→숫자) → 밸런스 5축 점수 계산
  const currentByName: Record<string, number> = {};
  for (const it of items ?? []) {
    const cell = valByMonthItem.get(`3|${it.id}`);
    if (typeof cell === "number") currentByName[it.name] = cell;
  }
  const balance = computeBalance(currentByName);

  return {
    snapshot: {
      student: student ?? {
        id: studentId,
        name: null,
        gender: null,
        birth: null,
        school: null,
        grade: null,
      },
      measurement_month: ym,
      months,
      month_dates: monthDates,
      sections,
      balance,
    },
    measurementId: currentM?.id ?? null,
  };
}

// 그 달 측정 승인완료 학생당 "월간" 리포트 1개 생성/갱신.
// 구버전 4종 리포트(신체성장/기록/체력측정/배드민턴측정)는 삭제(발행완료는 보존).
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
    // 승인된 측정 없음 → 조용히 종료 (UI에 0건 표시되고 버튼도 비활성)
    revalidatePath("/admin/reports");
    return;
  }

  // 기존 "월간" 리포트
  const { data: existing } = await supabase
    .from("reports")
    .select("id, student_id")
    .eq("center_id", centerId)
    .eq("report_month", ym)
    .eq("report_type", "월간");
  const haveByStudent = new Map(
    (existing ?? []).map((r) => [r.student_id, r.id]),
  );

  let processed = 0;
  for (const m of approved) {
    const { snapshot } = await buildSnapshot(supabase, m.student_id, ym);
    const existingId = haveByStudent.get(m.student_id);
    if (existingId) {
      // 갱신 (스냅샷만, 코멘트·발행상태는 유지)
      const { error } = await supabase
        .from("reports")
        .update({ snapshot, measurement_id: m.id, status: "생성완료" })
        .eq("id", existingId);
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
    processed += 1;
  }
  void processed;
  revalidatePath("/admin/reports");
}

// 단일 리포트 snapshot 재생성 (최신 측정값 + 3개월 추이 반영)
export async function regenerateSnapshot(formData: FormData) {
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
      snapshot,
      measurement_id: measurementId,
      status: "생성완료",
    })
    .eq("id", id);
  if (error) throw new Error("재생성 실패: " + error.message);
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

