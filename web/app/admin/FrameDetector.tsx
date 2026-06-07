"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

// ?frame=1 시 body 에 'admin-in-frame' class 토글.
// CSS 가 sidebar/topbar 숨김 + content padding 제거.
export default function FrameDetector() {
  const sp = useSearchParams();
  const inFrame = sp.get("frame") === "1";

  useEffect(() => {
    if (inFrame) {
      document.body.classList.add("admin-in-frame");
    } else {
      document.body.classList.remove("admin-in-frame");
    }
    return () => {
      document.body.classList.remove("admin-in-frame");
    };
  }, [inFrame]);

  return null;
}
