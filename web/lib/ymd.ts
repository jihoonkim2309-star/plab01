// 타임존 안전 YYYY-MM-DD 유틸.
// new Date(ymd+"T00:00:00").toISOString() 은 로컬→UTC 변환으로 자정을 넘기며
// 하루가 밀리는 off-by-one 을 일으킨다. 여기서는 UTC 고정 연산으로 회피한다.

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;

// 서버 타임존과 무관하게 KST(Asia/Seoul) 기준 오늘 YYYY-MM-DD.
export function todayYmd(): string {
  const kst = new Date(Date.now() + KST_OFFSET_MS);
  return `${kst.getUTCFullYear()}-${String(kst.getUTCMonth() + 1).padStart(2, "0")}-${String(kst.getUTCDate()).padStart(2, "0")}`;
}

// YYYY-MM-DD 에 delta 일을 더한 YYYY-MM-DD (타임존 무관, 순수 달력 연산).
export function shiftYmd(ymd: string, delta: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

// YYYY-MM-DD 의 요일 인덱스 (0=일 ~ 6=토), 타임존 무관.
export function weekdayOf(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
