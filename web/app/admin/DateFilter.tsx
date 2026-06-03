"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// 날짜 입력 필터. 값 변경 시 URL 즉시 갱신 (FilterSelect 와 같은 패턴).
// 다른 query 보존.
export default function DateFilter({
  param,
  current,
  ariaLabel = "날짜",
  style,
}: {
  param: string;
  current?: string;
  ariaLabel?: string;
  style?: React.CSSProperties;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = new URLSearchParams(sp);
    if (e.target.value) next.set(param, e.target.value);
    else next.delete(param);
    const s = next.toString();
    router.push(`${pathname}${s ? `?${s}` : ""}`);
  }

  return (
    <input
      type="date"
      value={current ?? ""}
      onChange={onChange}
      aria-label={ariaLabel}
      style={style}
    />
  );
}
