"use client";

import { useEffect, useRef, useState } from "react";

// 시간 선택 input — popover 안 [시간 select | 분 select] 또는 grid.
// value/onChange = 'HH:MM' string.
// 분 단위 step (기본 5분).
export default function TimePickerInput({
  value,
  onChange,
  name,
  required,
  placeholder = "HH:MM",
  step = 5,
  disabled,
}: {
  value?: string;
  onChange?: (v: string) => void;
  name?: string;
  required?: boolean;
  placeholder?: string;
  step?: number;
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

  const m = current.match(/^(\d{2}):(\d{2})$/);
  const selectedHour = m ? Number(m[1]) : null;
  const selectedMinute = m ? Number(m[2]) : null;

  const minutes: number[] = [];
  for (let i = 0; i < 60; i += step) minutes.push(i);

  function set(h: number, mi: number) {
    setCurrent(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
  }

  return (
    <div
      ref={rootRef}
      className="time-picker-root"
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
        <div className="date-picker-popover time-picker-popover">
          <div className="time-picker-columns">
            <div className="time-picker-col">
              <div className="time-picker-col-head">시</div>
              <div className="time-picker-col-body">
                {Array.from({ length: 24 }, (_, i) => i).map((h) => {
                  const on = selectedHour === h;
                  return (
                    <button
                      key={h}
                      type="button"
                      className={`time-picker-cell${on ? " selected" : ""}`}
                      onClick={() => set(h, selectedMinute ?? 0)}
                    >
                      {String(h).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="time-picker-col">
              <div className="time-picker-col-head">분</div>
              <div className="time-picker-col-body">
                {minutes.map((mi) => {
                  const on = selectedMinute === mi;
                  return (
                    <button
                      key={mi}
                      type="button"
                      className={`time-picker-cell${on ? " selected" : ""}`}
                      onClick={() => set(selectedHour ?? 0, mi)}
                    >
                      {String(mi).padStart(2, "0")}
                    </button>
                  );
                })}
              </div>
            </div>
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
                const now = new Date();
                set(now.getHours(), Math.round(now.getMinutes() / step) * step);
                setOpen(false);
              }}
            >
              지금
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
