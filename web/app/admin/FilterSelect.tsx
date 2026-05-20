"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";

// 드롭다운 필터. 옵션 많을 때 chips 대신 사용.
// 값 변경 시 URL 갱신, 다른 파라미터 자동 보존.
export default function FilterSelect({
  param,
  options,
  current,
  placeholder = "전체",
  ariaLabel,
}: {
  param: string;
  options: { value: string; label: string }[];
  current?: string;
  placeholder?: string;
  ariaLabel?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = new URLSearchParams(sp);
    if (e.target.value) next.set(param, e.target.value);
    else next.delete(param);
    const s = next.toString();
    router.push(`${pathname}${s ? `?${s}` : ""}`);
  }

  return (
    <select
      className="filter-select"
      value={current ?? ""}
      onChange={onChange}
      aria-label={ariaLabel ?? placeholder}
    >
      <option value="">{placeholder}</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
