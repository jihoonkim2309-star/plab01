"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// 브라우저 autofill (Chrome "저장된 정보" dropdown) 자동 무력화.
// pathname 변경 시 모든 form input/textarea 에 autocomplete='off' 부여.
// 이미 명시 속성이 있으면 건드리지 않음.
export default function SuppressAutofill() {
  const pathname = usePathname();
  useEffect(() => {
    const apply = () => {
      document.querySelectorAll<HTMLElement>("form input, form textarea").forEach((el) => {
        if (!el.hasAttribute("autocomplete")) {
          el.setAttribute("autocomplete", "off");
        }
      });
    };
    apply();
    // 페이지 안 동적 추가 (drawer/modal 열림 등) 도 잡기 위해 짧은 지연 한 번 더
    const t = setTimeout(apply, 100);
    return () => clearTimeout(t);
  }, [pathname]);
  return null;
}
