"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// 폼 제출 + 페이지 이동(링크 클릭) 시 본문 dim + 가운데 spinner overlay.
// children 을 대체하지 않으므로 이전 본문이 보이는 채로 처리 중 표시.
export default function GlobalLoading() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();

  // 페이지가 새로 그려질 때마다 오버레이 해제 (액션 → revalidate/redirect, 링크 이동 후)
  useEffect(() => {
    setShow(false);
  }, [pathname, search]);

  // 폼 제출 listen
  useEffect(() => {
    function onSubmit(e: SubmitEvent) {
      const form = e.target as HTMLFormElement | null;
      if (!form) return;
      if (form.target === "_blank") return;
      if (form.dataset.noLoading === "true") return;
      setShow(true);
    }
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  // 링크 클릭 listen — Next.js Link 도 a 태그라 click 이벤트 잡힘
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return;
      if (e.button !== 0) return; // 좌클릭만
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; // 새 탭 제외
      const el = e.target as Element | null;
      const a = el?.closest("a") as HTMLAnchorElement | null;
      if (!a) return;
      const href = a.getAttribute("href");
      if (!href) return;
      if (a.target === "_blank") return;
      if (a.dataset.noLoading === "true") return;
      // 외부 링크 (다른 origin) 제외
      try {
        const url = new URL(href, window.location.href);
        if (url.origin !== window.location.origin) return;
        // 같은 URL (현재 페이지 자기 자신 클릭) 제외
        if (url.pathname === window.location.pathname && url.search === window.location.search) return;
      } catch {
        return;
      }
      setShow(true);
    }
    document.addEventListener("click", onClick, true);
    return () => {
      document.removeEventListener("click", onClick, true);
    };
  }, []);

  // 너무 오래 걸리면 사용자가 다른 동작도 못 하니 30초 후 자동 해제 (안전장치)
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => setShow(false), 30000);
    return () => clearTimeout(t);
  }, [show]);

  if (!show) return null;
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <div>처리 중...</div>
    </div>
  );
}
