"use client";

import { useEffect } from "react";

// 브라우저 기본 "이 입력란을 작성하세요" 툴팁을 가린다.
// 폼 제출은 여전히 브라우저가 막아주고, 빨간 박스 + 인라인 메시지는 :user-invalid CSS 가 담당.
// 첫 invalid 필드로 부드럽게 스크롤해서 사용자가 위치를 찾기 쉽게.
export default function SuppressInvalidTooltip() {
  useEffect(() => {
    let scrolled = false;
    function onInvalid(e: Event) {
      e.preventDefault();
      if (!scrolled && e.target instanceof HTMLElement) {
        scrolled = true;
        e.target.scrollIntoView({ behavior: "smooth", block: "center" });
        // 다음 invalid 사이클을 위해 잠깐 후 리셋
        setTimeout(() => {
          scrolled = false;
        }, 200);
      }
    }
    document.addEventListener("invalid", onInvalid, true);
    return () => document.removeEventListener("invalid", onInvalid, true);
  }, []);
  return null;
}
