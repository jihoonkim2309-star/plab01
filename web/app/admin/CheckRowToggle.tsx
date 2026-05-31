"use client";

import { useEffect, useRef } from "react";

// 일괄 체크박스 테이블에서 행 어디든 클릭 시 그 행의 첫 체크박스를 토글.
// 사용: <CheckRowToggle><table>...</table></CheckRowToggle>
// 셀 안 실제 인터랙티브 요소(버튼·링크·input·label·select) 클릭은 자체 동작 유지.
export default function CheckRowToggle({
  children,
}: {
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root: HTMLDivElement | null = ref.current;
    if (!root) return;
    const host: HTMLDivElement = root;

    function onClick(e: MouseEvent) {
      const target = e.target as Element | null;
      if (!target) return;
      if (
        target.closest(
          "input, button, a, label, select, textarea, .btn, .no-row-toggle",
        )
      )
        return;
      const tr = target.closest("tr");
      if (!tr || !host.contains(tr)) return;
      const cb = tr.querySelector<HTMLInputElement>(
        'input[type="checkbox"][name="ids"]',
      );
      if (!cb) return;
      cb.checked = !cb.checked;
      cb.dispatchEvent(new Event("change", { bubbles: true }));
    }

    host.addEventListener("click", onClick);
    return () => host.removeEventListener("click", onClick);
  }, []);

  return (
    <div ref={ref} className="check-row-host list-scroll">
      {children}
    </div>
  );
}
