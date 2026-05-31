// 리포트 snapshot 생성 로직 (actions.ts와 preview/page.tsx에서 공용).
// 미리보기는 발행 전엔 라이브 빌드, 발행 후엔 DB에 저장된 snapshot을 사용.

import type { createClient } from "@/lib/supabase/server";
import { REPORT_CATEGORIES, CATEGORY_TITLES } from "./types";

type Supa = Awaited<ReturnType<typeof createClient>>;

export type TrendCell = number | string | null;
export type SnapshotTrendItem = {
  name: string;
  unit: string | null;
  category: string;
  icon: string | null;
  iconUrl: string | null;
  iconHidden: boolean;
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
  month_dates: [string, string, string, string]; // YYYY.MM.DD
  sections: SnapshotSection[];
  balance: BalanceScores;
};

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

// 항목별 원값을 0-100 점수로 정규화. 연령대별 기준은 데이터 확보 전 임시값.
const HIGHER_BETTER: Record<string, { min: number; max: number }> = {
  "제자리 멀리뛰기": { min: 100, max: 220 },
  "수직 점프": { min: 20, max: 55 },
  "스텝 테스트": { min: 30, max: 90 },
  "라켓 컨트롤": { min: 10, max: 60 },
  정확도: { min: 40, max: 100 },
  골격근량: { min: 10, max: 30 },
};
const LOWER_BETTER: Record<string, { good: number; bad: number }> = {
  "20m 달리기": { good: 3.0, bad: 5.0 },
  반응속도: { good: 0.3, bad: 0.85 },
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

export async function buildSnapshot(
  supabase: Supa,
  studentId: string,
  ym: string,
  centerId?: string,
): Promise<{ snapshot: Snapshot; measurementId: string | null }> {
  const months = prevMonths(ym);

  // 학생의 center_id 도 함께 가져와 measurement_items 필터에 사용
  const studentQuery = supabase
    .from("students")
    .select("id, name, gender, birth, school, grade, center_id")
    .eq("id", studentId);
  const { data: student } = await studentQuery.single();
  const cid = centerId ?? (student as { center_id?: string } | null)?.center_id ?? null;

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

  let itemsQuery = supabase
    .from("measurement_items")
    .select(
      "id, category, name, unit, icon, icon_url, icon_hidden, sort_order, active",
    )
    .eq("active", true)
    .in("category", REPORT_CATEGORIES)
    .order("sort_order", { ascending: true });
  if (cid) itemsQuery = itemsQuery.eq("center_id", cid);
  const { data: items } = await itemsQuery;

  const mids = (ms ?? []).map((m) => m.id);
  const { data: vals } = mids.length
    ? await supabase
        .from("measurement_values")
        .select("measurement_id, item_id, value_num, value_text")
        .in("measurement_id", mids)
    : { data: [] };

  const valByMonthItem = new Map<string, TrendCell>();
  for (const v of vals ?? []) {
    const monthEntry = (ms ?? []).find((m) => m.id === v.measurement_id);
    if (!monthEntry) continue;
    const idx = months.indexOf(monthEntry.measurement_month);
    if (idx < 0) continue;
    const cell: TrendCell =
      v.value_num != null ? Number(v.value_num) : (v.value_text ?? null);
    valByMonthItem.set(`${idx}|${v.item_id}`, cell);
  }

  const monthDates = months.map((m) => {
    const me = msByMonth.get(m);
    if (me?.measured_at) {
      return me.measured_at.slice(0, 10).replace(/-/g, ".");
    }
    return `${m.replace("-", ".")}.--`;
  }) as [string, string, string, string];

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
          iconUrl: it.icon_url ?? null,
          iconHidden: it.icon_hidden ?? false,
          values: [v3, v2, v1, v0] as [TrendCell, TrendCell, TrendCell, TrendCell],
          change_abs,
          change_pct,
        };
      }),
    };
  }).filter((s) => s.items.length > 0);

  // 현재 달 항목별 값 → 밸런스 5축 점수
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
