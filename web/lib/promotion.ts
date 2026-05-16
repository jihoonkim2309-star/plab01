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
