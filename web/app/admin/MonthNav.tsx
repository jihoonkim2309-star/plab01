import Link from "next/link";

const pad = (n: number) => String(n).padStart(2, "0");

// 공통 월 네비 컨트롤 — 이전 / 현재(클릭=오늘) / 다음.
// 여러 페이지(/admin/reports, /admin/measurements, /admin/schedule …)에서 동일 디자인 사용.
export default function MonthNav({
  ym,
  baseUrl,
  extra,
  formatLabel,
}: {
  ym: string;
  baseUrl: string;
  extra?: Record<string, string | null | undefined>;
  formatLabel?: (ym: string) => string;
}) {
  const [y, m] = ym.split("-").map(Number);
  const prev = new Date(y, m - 2, 1);
  const next = new Date(y, m, 1);
  const prevYm = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  const nextYm = `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;
  const today = new Date();
  const todayYm = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;

  function url(target: string) {
    const qs = new URLSearchParams();
    qs.set("ym", target);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) qs.set(k, v);
      }
    }
    return `${baseUrl}?${qs.toString()}`;
  }

  const label = formatLabel ? formatLabel(ym) : `${y}년 ${m}월`;
  const isToday = ym === todayYm;

  return (
    <div className="month-nav" role="group" aria-label="월 이동">
      <Link className="month-nav-arrow" href={url(prevYm)} aria-label="이전달">
        ‹
      </Link>
      <Link
        className="month-nav-label"
        href={url(todayYm)}
        title={isToday ? "오늘" : "이번달로 이동"}
      >
        {label}
      </Link>
      <Link className="month-nav-arrow" href={url(nextYm)} aria-label="다음달">
        ›
      </Link>
    </div>
  );
}
