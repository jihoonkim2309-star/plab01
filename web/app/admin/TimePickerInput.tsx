"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

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
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);

  const current = onChange ? (value ?? "") : internalValue;
  const setCurrent = (v: string) => {
    if (onChange) onChange(v);
    else setInternalValue(v);
  };

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open) return;
    function reposition() {
      const r = inputRef.current?.getBoundingClientRect();
      if (!r) return;
      const popoverH = popoverRef.current?.offsetHeight ?? 320;
      const popoverW = popoverRef.current?.offsetWidth ?? 220;
      const margin = 8;
      let top = r.bottom + 6;
      if (top + popoverH + margin > window.innerHeight) {
        top = Math.max(margin, r.top - popoverH - 6);
      }
      let left = r.left;
      if (left + popoverW + margin > window.innerWidth) {
        left = Math.max(margin, window.innerWidth - popoverW - margin);
      }
      setCoords({ top, left });
    }
    reposition();
    requestAnimationFrame(reposition);
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
    return () => {
      window.removeEventListener("scroll", reposition, true);
      window.removeEventListener("resize", reposition);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      const t = e.target as Node;
      if (inputRef.current?.contains(t)) return;
      if (popoverRef.current?.contains(t)) return;
      setOpen(false);
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

  // popover 열림 + selected 변경 시 선택된 셀로 자동 스크롤
  useEffect(() => {
    if (!open) return;
    const scroll = (col: HTMLDivElement | null, idx: number | null) => {
      if (!col || idx === null) return;
      const cells = col.querySelectorAll<HTMLButtonElement>(".time-picker-cell");
      if (cells.length === 0) return;
      const cell = cells[Math.min(idx, cells.length - 1)];
      if (!cell) return;
      // 컬럼 안에서 가운데로 스크롤 (전체 페이지 스크롤 영향 없게 직접 scrollTop 조정)
      const cellOffset = cell.offsetTop;
      const colHeight = col.clientHeight;
      const cellHeight = cell.offsetHeight;
      col.scrollTop = cellOffset - colHeight / 2 + cellHeight / 2;
    };
    requestAnimationFrame(() => {
      scroll(hourColRef.current, selectedHour);
      // 분은 step 단위이므로 index 변환
      const minIdx =
        selectedMinute !== null ? Math.round(selectedMinute / step) : null;
      scroll(minuteColRef.current, minIdx);
    });
  }, [open, selectedHour, selectedMinute, step]);
  // 5자 완성 + 시 0~23 / 분 0~59 가 아니면 invalid
  const isInvalid =
    current.length === 5 &&
    (!m ||
      selectedHour === null ||
      selectedMinute === null ||
      selectedHour < 0 ||
      selectedHour > 23 ||
      selectedMinute < 0 ||
      selectedMinute > 59);

  const minutes: number[] = [];
  for (let i = 0; i < 60; i += step) minutes.push(i);

  function set(h: number, mi: number) {
    setCurrent(`${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`);
  }

  return (
    <div className="time-picker-root">
      <input
        ref={inputRef}
        type="text"
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={5}
        aria-invalid={isInvalid || undefined}
        style={
          isInvalid
            ? {
                borderColor: "#ef4444",
                background: "#fff7f7",
                boxShadow: "0 0 0 3px rgba(239,68,68,.12)",
              }
            : undefined
        }
        onKeyDown={(e) => {
          // 5자 마스크 완성 후 숫자 키 = 덮어쓰기
          if (current.length < 5) return;
          if (!/^\d$/.test(e.key)) return;
          e.preventDefault();
          const input = e.currentTarget;
          let pos = input.selectionStart ?? 0;
          while (pos < 5 && current[pos] === ":") pos++;
          if (pos >= 5) return;
          const next = current.substring(0, pos) + e.key + current.substring(pos + 1);
          setCurrent(next.substring(0, 5));
          let nextPos = pos + 1;
          while (nextPos < 5 && next[nextPos] === ":") nextPos++;
          requestAnimationFrame(() => {
            input.setSelectionRange(nextPos, nextPos);
          });
        }}
        onChange={(e) => {
          // 자동 콜론 (HH:MM)
          const raw = e.target.value.replace(/[^\d:]/g, "");
          const digits = raw.replace(/:/g, "").slice(0, 4);
          let formatted = digits;
          if (digits.length >= 3) formatted = `${digits.slice(0, 2)}:${digits.slice(2, 4)}`;
          setCurrent(formatted);
        }}
        onClick={() => !disabled && setOpen(true)}
        onFocus={() => !disabled && setOpen(true)}
        autoComplete="off"
      />
      {name && <input type="hidden" name={name} value={current} required={required} />}
      {isInvalid && (
        <div className="field-error-text" style={{ marginTop: 4 }}>
          올바른 시간이 아닙니다 (HH:MM)
        </div>
      )}
      {open && !disabled && mounted && coords &&
        createPortal(
          <div
            ref={popoverRef}
            className="date-picker-popover time-picker-popover"
            style={{ position: "fixed", top: coords.top, left: coords.left }}
          >
            <div className="time-picker-columns">
              <div className="time-picker-col">
                <div className="time-picker-col-head">시</div>
                <div className="time-picker-col-body" ref={hourColRef}>
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
                <div className="time-picker-col-body" ref={minuteColRef}>
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
          </div>,
          document.body,
        )}
    </div>
  );
}
