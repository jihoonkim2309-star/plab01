"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// "전체 / A / B / C" 스타일 칩 필터. URL ?param=value 로 상태 표현.
// 다른 URL 파라미터는 자동 보존.
export default function StatusChips({
  param,
  options,
  current,
  allLabel = "전체",
}: {
  param: string;
  options: { value: string; label: string }[];
  current?: string;
  allLabel?: string;
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  function urlFor(val: string | undefined) {
    const next = new URLSearchParams(sp);
    if (val) next.set(param, val);
    else next.delete(param);
    const s = next.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  }

  return (
    <div className="filter-chips" role="group">
      <Link
        className={`btn${!current ? " toggle-active" : ""}`}
        href={urlFor(undefined)}
      >
        {allLabel}
      </Link>
      {options.map((o) => (
        <Link
          key={o.value}
          className={`btn${current === o.value ? " toggle-active" : ""}`}
          href={urlFor(o.value)}
        >
          {o.label}
        </Link>
      ))}
    </div>
  );
}
