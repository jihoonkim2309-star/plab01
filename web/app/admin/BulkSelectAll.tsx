"use client";

import { useEffect, useRef, useState } from "react";

// 일괄 처리 form 안의 전체 선택 체크박스.
// 같은 form 안의 모든 `input[name="ids"]:not(:disabled)` 와 동기화.
// indeterminate 상태 지원.
export default function BulkSelectAll() {
  const ref = useRef<HTMLInputElement>(null);
  const [allChecked, setAllChecked] = useState(false);

  useEffect(() => {
    const cb = ref.current;
    if (!cb) return;
    const form = cb.closest("form");
    if (!form) return;

    function sync() {
      const all = form!.querySelectorAll<HTMLInputElement>(
        'input[type="checkbox"][name="ids"]:not(:disabled)',
      );
      const arr = Array.from(all);
      const checked = arr.filter((x) => x.checked);
      const a = arr.length > 0 && checked.length === arr.length;
      const s = checked.length > 0 && checked.length < arr.length;
      setAllChecked(a);
      cb!.indeterminate = s;
    }

    sync();
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, []);

  function toggle() {
    const cb = ref.current;
    if (!cb) return;
    const form = cb.closest("form");
    if (!form) return;
    const all = form.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"][name="ids"]:not(:disabled)',
    );
    const next = !allChecked;
    all.forEach((x) => {
      if (x.checked !== next) {
        x.checked = next;
        x.dispatchEvent(new Event("change", { bubbles: true }));
      }
    });
    setAllChecked(next);
    cb.indeterminate = false;
  }

  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label="전체 선택"
      checked={allChecked}
      onChange={toggle}
    />
  );
}
