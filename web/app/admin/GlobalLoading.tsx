"use client";

import { useEffect, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// 전역 폼 제출 감지 → 결과가 페이지 갱신/이동으로 끝날 때까지 오버레이 표시.
// 라우트 간 이동의 자동 로딩은 admin/loading.tsx 가 처리, 이 컴포넌트는 액션(폼 제출) 담당.
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
      // 새 탭/다운로드/no-loading 표시 폼은 제외
      if (form.target === "_blank") return;
      if (form.dataset.noLoading === "true") return;
      setShow(true);
    }
    document.addEventListener("submit", onSubmit, true);
    return () => document.removeEventListener("submit", onSubmit, true);
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
