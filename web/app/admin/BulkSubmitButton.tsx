"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 일괄 처리 form 안의 submit 버튼.
// - 같은 form 안의 `input[name="ids"]:checked` 갯수 자동 카운트
// - count === 0 이면 disabled, emptyLabel 표시
// - count > 0 이면 "선택 N건 {label}" 표시
// - confirmMessage 있으면 모달 confirm 후 submit
// - submit 시 name/value 가 formData 에 전달 (action 구분용)
// 사용: <BulkSubmitButton name="action" value="publish"
//         label="발행" emptyLabel="일괄 발행"
//         confirmMessage="..." />

type Variant = "primary" | "danger" | "default";

export default function BulkSubmitButton({
  name,
  value,
  label,
  emptyLabel,
  confirmMessage,
  variant = "primary",
}: {
  name: string;
  value: string;
  label: string;
  emptyLabel?: string;
  confirmMessage?: string;
  variant?: Variant;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const btn = ref.current;
    if (!btn) return;
    const form = btn.closest("form");
    if (!form) return;

    function sync() {
      const checked = form!.querySelectorAll(
        'input[type="checkbox"][name="ids"]:checked',
      ).length;
      setCount(checked);
    }
    sync();
    form.addEventListener("change", sync);
    return () => form.removeEventListener("change", sync);
  }, []);

  function doSubmit() {
    const btn = ref.current;
    const form = btn?.closest("form");
    if (!btn || !form) return;
    // submitter 로 button 자체 지정 → name/value 자동 포함
    form.requestSubmit(btn);
  }

  function onClick() {
    if (count === 0) return;
    if (confirmMessage) setOpen(true);
    else doSubmit();
  }

  function onConfirm() {
    setOpen(false);
    queueMicrotask(doSubmit);
  }

  const display =
    count === 0 ? (emptyLabel ?? label) : `선택 ${count}건 ${label}`;
  const cls =
    variant === "primary"
      ? "btn primary"
      : variant === "danger"
        ? "btn danger"
        : "btn";

  return (
    <>
      <button
        ref={ref}
        type="submit"
        name={name}
        value={value}
        className={cls}
        disabled={count === 0}
        onClick={(e) => {
          if (confirmMessage) {
            e.preventDefault();
            onClick();
          }
          // confirmMessage 없으면 native submit
        }}
      >
        {display}
      </button>
      {open &&
        mounted &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="modal-card" role="dialog" aria-modal="true">
              <div className="modal-body">
                <p className="modal-message">{confirmMessage}</p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                  autoFocus
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn danger"
                  onClick={onConfirm}
                >
                  확인
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
