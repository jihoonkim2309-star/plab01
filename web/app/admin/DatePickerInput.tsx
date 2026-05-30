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
      if (r) setCoords({ top: r.bottom + 6, left: r.left });
    }
    reposition();
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

  return (
    <div className="date-picker-root">
      <input
        ref={inputRef}
        id={id}
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
