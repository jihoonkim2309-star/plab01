"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

// 디바운스된 검색 입력. 입력 멈춘 뒤 350ms 후 URL ?param=q 로 푸시.
// 다른 파라미터 자동 보존. Enter 누르면 즉시 반영.
export default function SearchInput({
  param,
  placeholder = "검색...",
  current,
}: {
  param: string;
  placeholder?: string;
  current?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [value, setValue] = useState(current ?? "");
  const skipNextRef = useRef(true);

  // current(URL 변동) 와 sync — 외부에서 초기화/뒤로가기로 바뀐 경우 반영
  useEffect(() => {
    skipNextRef.current = true;
    setValue(current ?? "");
  }, [current]);

  // 디바운스
  useEffect(() => {
    if (skipNextRef.current) {
      skipNextRef.current = false;
      return;
    }
    const t = setTimeout(() => push(value), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  function push(v: string) {
    const next = new URLSearchParams(sp);
    if (v) next.set(param, v);
    else next.delete(param);
    const s = next.toString();
    router.push(`${pathname}${s ? `?${s}` : ""}`);
  }

  return (
    <input
      type="search"
      className="filter-search"
      placeholder={placeholder}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          push(value);
        }
      }}
    />
  );
}
