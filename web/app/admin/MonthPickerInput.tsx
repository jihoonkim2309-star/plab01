"use client";

import { useEffect, useRef, useState } from "react";

// 월 선택 input — popover 안에 [년 ◀ ▶] 헤더 + 12개월 grid.
// value/onChange = 'YYYY-MM' string.
export default function MonthPickerInput({
  value,
  onChange,
  name,
  required,
  placeholder = "YYYY-MM",
  disabled,
}: {
  value?: string;
  onChange?: (v: string) => void;
  name?: string;
  required?: boolean;
  placeholder?: string;
  disabled?: boolean;
}) {
  const [internalValue, setInternalValue] = useState(value ?? "");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const current = onChange ? (value ?? "") : internalValue;
  const setCurrent = (v: string) => {
    if (onChange) onChange(v);
    else setInternalValue(v);
  };

  const now = new Date();
  const [year, setYear] = useState<number>(() => {
    const m = current.match(/^(\d{4})-(\d{2})$/);
    return m ? Number(m[1]) : now.getFullYear();
  });

  useEffect(() => {
    if (open) {
      const m = current.match(/^(\d{4})-(\d{2})$/);
      if (m) setYear(Number(m[1]));
    }
  }, [open, current]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, [open]);

  const selectedYear = current ? Number(current.slice(0, 4)) : null;
  const selectedMonth = current ? Number(current.slice(5, 7)) : null;

  function pick(month: number) {
    const mm = String(month).padStart(2, "0");
    setCurrent(`${year}-${mm}`);
    setOpen(false);
  }

  return (
    <div
      ref={rootRef}
      className="month-picker-root"
      style={{ position: "relative" }}
    >
      <input
        type="text"
        value={current}
        readOnly
        disabled={disabled}
        placeholder={placeholder}
        onClick={() => !disabled && setOpen((v) => !v)}
        onFocus={() => !disabled && setOpen(true)}
        style={{ cursor: disabled ? "not-allowed" : "pointer" }}
      />
      {name && <input type="hidden" name={name} value={current} required={required} />}
      {open && !disabled && (
        <div className="date-picker-popover">
          <div className="month-picker-head">
            <button
              type="button"
              className="month-picker-nav"
              onClick={() => setYear((y) => y - 1)}
              aria-label="이전 해"
            >
              ‹
            </button>
            <strong>{year}년</strong>
            <button
              type="button"
              className="month-picker-nav"
              onClick={() => setYear((y) => y + 1)}
              aria-label="다음 해"
            >
              ›
            </button>
          </div>
          <div className="month-picker-grid">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const on = selectedYear === year && selectedMonth === m;
              return (
                <button
                  key={m}
                  type="button"
                  className={`month-picker-cell${on ? " selected" : ""}`}
                  onClick={() => pick(m)}
                >
                  {m}월
                </button>
              );
            })}
          </div>
          <div className="date-picker-footer">
            <button
              type="button"
              className="btn"
              style={{ minHeight: 28, padding: "4px 10px" }}
              onClick={() => {
                setCurrent("");
                setOpen(false);
              }}
            >
              비우기
            </button>
            <button
              type="button"
              className="btn primary"
              style={{ minHeight: 28, padding: "4px 10px" }}
              onClick={() => {
                const y = now.getFullYear();
                const mm = String(now.getMonth() + 1).padStart(2, "0");
                setCurrent(`${y}-${mm}`);
                setOpen(false);
              }}
            >
              이번 달
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
