import { NAV } from "./nav";

// pathname → 사이드바 nav.ts 의 label 매칭. 못 찾으면 끝 segment.
export function labelForPath(pathname: string): string {
  for (const grp of NAV) {
    for (const it of grp.items) {
      if (it.href === pathname) return it.label;
    }
  }
  // 가까운 prefix 매칭
  let best: { len: number; label: string } | null = null;
  for (const grp of NAV) {
    for (const it of grp.items) {
      if (pathname.startsWith(it.href + "/") && it.href.length > (best?.len ?? 0)) {
        best = { len: it.href.length, label: it.label };
      }
    }
  }
  if (best) return best.label;
  if (pathname === "/admin") return "대시보드";
  const last = pathname.split("/").filter(Boolean).pop();
  return last ?? "어드민";
}
