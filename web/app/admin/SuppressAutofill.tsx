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
    // ⚠️ 즉시 실행하면 layout 이 page 폼보다 먼저 hydrate 되어, 아직 hydrate 전인
    // 폼 input 의 DOM 속성을 mutate → React 가 hydration mismatch 경고.
    // hydration 이 끝난 뒤(지연)에만 적용한다.
    const t1 = setTimeout(apply, 200);
    const t2 = setTimeout(apply, 600); // drawer/modal 등 늦게 뜨는 폼도 커버
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [pathname]);
  return null;
}
