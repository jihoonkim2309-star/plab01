// 학년 승급 규칙 (서버 액션과 화면 공용, 'use server' 아님).
export const GRADE_SEQ = [
  "5세", "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
  "고1", "고2", "고3",
];

export function nextGrade(cur: string | null): string | null {
  if (!cur) return null;
  const i = GRADE_SEQ.indexOf(cur);
  if (i < 0 || i + 1 >= GRADE_SEQ.length) return null;
  return GRADE_SEQ[i + 1];
}

// 학교가 바뀌는 승급(=학부모 입력 필요)과 유형 판별.
export function promoMeta(to: string | null): {
  type: string;
  needsParentInput: boolean;
} {
  if (to === "초1") return { type: "초등 입학", needsParentInput: true };
  if (to === "중1") return { type: "초등→중등", needsParentInput: true };
  if (to === "고1") return { type: "중등→고등", needsParentInput: true };
  return { type: "일반 승급", needsParentInput: false };
}

// 승급 처리일(MM-DD) 기반의 상태 계산.
// - 미설정 → not-configured
// - 올해 그 날짜가 아직 안 됨 → before (D-day 표시)
// - 그 날짜를 지났음 → after (일괄 생성 가능)
export type PromotionGate =
  | { state: "not-configured" }
  | { state: "before"; targetDate: string; daysLeft: number; promotionDay: string }
  | { state: "after"; targetDate: string; promotionDay: string };

export function checkPromotionGate(
  promotionDay: string | null | undefined,
  now: Date = new Date(),
): PromotionGate {
  if (!promotionDay || !/^\d{2}-\d{2}$/.test(promotionDay)) {
    return { state: "not-configured" };
  }
  const [mm, dd] = promotionDay.split("-").map(Number);
  const y = now.getFullYear();
  const target = new Date(y, mm - 1, dd);
  const today = new Date(y, now.getMonth(), now.getDate());
  const diffMs = target.getTime() - today.getTime();
  const days = Math.round(diffMs / 86400000);
  const isoTarget = `${y}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}`;
  if (days > 0) {
    return { state: "before", targetDate: isoTarget, daysLeft: days, promotionDay };
  }
  return { state: "after", targetDate: isoTarget, promotionDay };
}

// 페이지 진입 시 자동 호출. 처리일 도래 후 그 학년도 승급 행 없는 학생 자동 insert (멱등).
// 청구/리포트/수강확인 ensure* 패턴과 일관. 반환: 신규 생성된 승급 행 수.
import { requireCenter } from "./center";

export async function ensurePromotionsForYear(): Promise<number> {
  const { supabase, centerId } = await requireCenter();

  const { data: center } = await supabase
    .from("centers")
    .select("promotion_day")
    .eq("id", centerId)
    .maybeSingle();
  const gate = checkPromotionGate(
    (center as { promotion_day: string | null } | null)?.promotion_day,
  );
  if (gate.state !== "after") return 0;

  const schoolYear = String(new Date().getFullYear());

  // 정상 상태 학생 + 그 학년도 기존 승급 행 — 병렬
  const [studsRes, existingRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, grade")
      .eq("center_id", centerId)
      .eq("status", "정상"),
    supabase
      .from("grade_promotions")
      .select("student_id")
      .eq("center_id", centerId)
      .eq("school_year", schoolYear),
  ]);
  const studs = (studsRes.data ?? []) as { id: string; grade: string | null }[];
  if (studs.length === 0) return 0;

  const existingSet = new Set(
    (existingRes.data ?? []).map((r) => r.student_id),
  );

  const rows: Array<Record<string, unknown>> = [];
  for (const s of studs) {
    if (existingSet.has(s.id)) continue;
    const to = nextGrade(s.grade);
    if (!to) continue; // 졸업/대상 아님
    const meta = promoMeta(to);
    rows.push({
      center_id: centerId,
      student_id: s.id,
      school_year: schoolYear,
      from_grade: s.grade ?? null,
      to_grade: to,
      to_school: null,
      promo_type: meta.type,
      needs_parent_input: meta.needsParentInput,
      status: meta.needsParentInput ? "학부모 입력 요청" : "진학 확인 필요",
    });
  }
  if (rows.length === 0) return 0;

  const { error } = await supabase.from("grade_promotions").insert(rows);
  if (error) throw new Error("승급 자동 생성 실패: " + error.message);
  return rows.length;
}
