"use client";

import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { DayPicker } from "react-day-picker";
import "react-day-picker/style.css";
import { ko } from "date-fns/locale";
import { format, parse, isValid } from "date-fns";

// 단일 일자 선택 input + popover DayPicker (brand 그린 톤).
// value/onChange = 'YYYY-MM-DD' string (또는 빈 string).
// name 지정 시 hidden input 으로 form 에 합류.
export default function DatePickerInput({
  value,
  onChange,
  name,
  required,
  placeholder = "YYYY-MM-DD",
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
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null);
  const [month, setMonth] = useState<Date | undefined>(undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const id = useId();

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
      const popoverH = popoverRef.current?.offsetHeight ?? 380;
      const popoverW = popoverRef.current?.offsetWidth ?? 320;
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
    // popover 가 렌더된 후 실제 크기 측정해서 재배치
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

  const selected =
    current && isValid(parse(current, "yyyy-MM-dd", new Date()))
      ? parse(current, "yyyy-MM-dd", new Date())
      : undefined;

  // 텍스트 입력으로 유효 날짜 되면 캘린더도 그 달로 자동 이동
  useEffect(() => {
    if (selected) setMonth(selected);
  }, [selected?.getTime()]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="date-picker-root">
      <input
        ref={inputRef}
        id={id}
        type="text"
        value={current}
        disabled={disabled}
        placeholder={placeholder}
        inputMode="numeric"
        maxLength={10}
        onKeyDown={(e) => {
          // 값이 비어 있으면 일반 onChange (자동 하이픈) 로 처리
          if (!current) return;
          // 숫자 키만 덮어쓰기 모드 — 기존 자리 문자 대체
          if (!/^\d$/.test(e.key)) return;
          e.preventDefault();
          const input = e.currentTarget;
          let pos = input.selectionStart ?? 0;
          // 하이픈 위치면 다음 숫자 자리로 건너뜀
          while (pos < 10 && current[pos] === "-") pos++;
          if (pos >= 10) return;
          // 그 자리 한 글자 대체
          const next = current.substring(0, pos) + e.key + current.substring(pos + 1);
          setCurrent(next.substring(0, 10));
          // cursor 다음 자리 (하이픈 건너뜀)
          let nextPos = pos + 1;
          while (nextPos < 10 && next[nextPos] === "-") nextPos++;
          requestAnimationFrame(() => {
            input.setSelectionRange(nextPos, nextPos);
          });
        }}
        onChange={(e) => {
          // 빈 값에서 시작하는 일반 입력 — 자동 하이픈 (YYYY-MM-DD)
          const raw = e.target.value.replace(/[^\d-]/g, "");
          const digits = raw.replace(/-/g, "").slice(0, 8);
          let formatted = digits;
          if (digits.length >= 5) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}`;
          if (digits.length >= 7) formatted = `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
          setCurrent(formatted);
        }}
        onClick={() => !disabled && setOpen(true)}
        onFocus={() => !disabled && setOpen(true)}
        autoComplete="off"
      />
      {name && <input type="hidden" name={name} value={current} required={required} />}
      {open && !disabled && mounted && coords &&
        createPortal(
          <div
            ref={popoverRef}
            className="date-picker-popover"
            style={{ position: "fixed", top: coords.top, left: coords.left }}
          >
            <DayPicker
              mode="single"
              locale={ko}
              selected={selected}
              month={month}
              onMonthChange={setMonth}
              onSelect={(d) => {
                if (d) {
                  setCurrent(format(d, "yyyy-MM-dd"));
                  setOpen(false);
                }
              }}
              captionLayout="dropdown"
              startMonth={new Date(1990, 0)}
              endMonth={new Date(2050, 11)}
              showOutsideDays
              classNames={{
                root: "rdp-root",
                day_button: "rdp-day_button",
                selected: "rdp-selected",
                today: "rdp-today",
                chevron: "rdp-chevron",
              }}
            />
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
                  setCurrent(format(new Date(), "yyyy-MM-dd"));
                  setOpen(false);
                }}
              >
                오늘
              </button>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
