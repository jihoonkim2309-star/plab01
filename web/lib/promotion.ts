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
