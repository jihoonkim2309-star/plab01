"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// 폼 제출 시 결과까지 오버레이 표시. 페이지 이동(링크 클릭) 은
// admin/loading.tsx 의 skeleton 이 담당 — 두 오버레이 중복 방지.
export default function GlobalLoading() {
  const [show, setShow] = useState(false);
  const pathname = usePathname();
  const search = useSearchParams();

  // 페이지가 새로 그려질 때마다 오버레이 해제 (액션 → revalidate/redirect 후)
  useEffect(() => {
    setShow(false);
  }, [pathname, search]);

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
