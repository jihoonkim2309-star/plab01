"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

// 정렬 가능한 테이블 헤더 셀.
// 클릭 시 ?sort=<key>&dir=asc|desc 순환: 없음 → asc → desc → 없음.
// 다른 URL 파라미터는 자동 보존.
export default function SortHeader({
  sortKey,
  label,
  current,
  dir,
  align = "left",
}: {
  sortKey: string;
  label: string;
  current?: string;
  dir?: string;
  align?: "left" | "right" | "center";
}) {
  const pathname = usePathname();
  const sp = useSearchParams();

  const active = current === sortKey;
  const nextDir =
    !active ? "asc" : dir === "asc" ? "desc" : null;

  function urlFor() {
    const next = new URLSearchParams(sp);
    if (nextDir) {
      next.set("sort", sortKey);
      next.set("dir", nextDir);
    } else {
      next.delete("sort");
      next.delete("dir");
    }
    const s = next.toString();
    return `${pathname}${s ? `?${s}` : ""}`;
  }

  const arrow = !active ? "↕" : dir === "asc" ? "↑" : "↓";

  return (
    <Link
      href={urlFor()}
      className="sort-header"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        color: "inherit",
        textDecoration: "none",
        justifyContent:
          align === "right"
            ? "flex-end"
            : align === "center"
              ? "center"
              : "flex-start",
        opacity: active ? 1 : 0.85,
      }}
    >
      <span>{label}</span>
      <span style={{ fontSize: 11, opacity: active ? 0.9 : 0.45 }}>{arrow}</span>
    </Link>
  );
}
