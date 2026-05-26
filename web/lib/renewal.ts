// 다음 달 수강 확인 게이트 — 매월 N일 기반.
// 미설정 → not-configured (어드민 안내)
// 이달 N일 전 → before (D-day 표시)
// 이달 N일 지남 → after (일괄 처리 가능)

export type RenewalGate =
  | { state: "not-configured" }
  | { state: "before"; day: number; daysLeft: number }
  | { state: "after"; day: number };

export function checkRenewalGate(
  day: number | null | undefined,
  now: Date = new Date(),
): RenewalGate {
  if (!day || day < 1 || day > 28) return { state: "not-configured" };
  const today = now.getDate();
  if (today < day) {
    return { state: "before", day, daysLeft: day - today };
  }
  return { state: "after", day };
}
