"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";

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
  matchSelector,
  formAction,
}: {
  name: string;
  value: string;
  label: string;
  emptyLabel?: string;
  confirmMessage?: string;
  variant?: Variant;
  // 카운트할 체크박스를 좁히는 추가 CSS selector
  // 예: '[data-pub="0"]' 또는 ':is([data-status="pending"], [data-status="linked"])'
  matchSelector?: string;
  // form 의 default action 외 다른 server action 사용 시 (button 의 formAction override)
  formAction?: (formData: FormData) => void | Promise<void>;
}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [count, setCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  // 페이지 navigation 시 modal 자동 close (잔재 방지)
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    const btn = ref.current;
    if (!btn) return;
    const form = btn.closest("form");
    if (!form) return;

    const extra = matchSelector ?? "";
    function sync() {
      const checked = form!.querySelectorAll(
        `input[type="checkbox"][name="ids"]${extra}:checked`,
      ).length;
      setCount(checked);
    }
    sync();
    form.addEventListener("change", sync);
    // server re-render (revalidatePath) 후 checkbox 변경 감지
    const mo = new MutationObserver(sync);
    mo.observe(form, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["disabled", "checked"],
    });
    return () => {
      form.removeEventListener("change", sync);
      mo.disconnect();
    };
  }, [matchSelector]);

  function doSubmit() {
    const btn = ref.current;
    const form = btn?.closest("form");
    if (!btn || !form) return;
    // submitter 로 button 자체 지정 → name/value 자동 포함
    form.requestSubmit(btn);
  }

  function onClick() {
    if (count === 0) {
      // disabled 라 보통 도달 X. 안전망.
      alert("선택된 항목이 없습니다.");
      return;
    }
    if (confirmMessage) setOpen(true);
    else doSubmit();
  }

  function onConfirm() {
    setOpen(false);
    if (count === 0) return; // 안전망
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
        formAction={formAction}
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
