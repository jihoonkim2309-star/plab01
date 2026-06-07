"use client";

import { useEffect } from "react";

// ?frame=1 시 body 에 'admin-in-frame' class 토글.
// window.location 직접 검사 — useSearchParams 의 Suspense 의존성 회피.
export default function FrameDetector() {
  useEffect(() => {
    const check = () => {
      try {
        const sp = new URLSearchParams(window.location.search);
        if (sp.get("frame") === "1") {
          document.body.classList.add("admin-in-frame");
        } else {
          document.body.classList.remove("admin-in-frame");
        }
      } catch {
        /* ignore */
      }
    };
    check();
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("popstate", check);
      document.body.classList.remove("admin-in-frame");
    };
  }, []);

  return null;
}
