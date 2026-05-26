"use client";

import type { ButtonHTMLAttributes } from "react";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

// 파괴적 액션 확인 다이얼로그 — 커스텀 모달 (native confirm 대신).
// 같은 form 안의 submit 버튼처럼 동작: [확인] 누르면 closest form 을 requestSubmit().
export default function ConfirmButton({
  message,
  children,
  ...rest
}: { message: string; children: React.ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open]);

  function confirm() {
    setOpen(false);
    // 약간의 지연 — 모달 닫힘 + 포커스 복원 후 submit
    queueMicrotask(() => {
      const form = btnRef.current?.closest("form");
      if (form) {
        // submit 시 button 의 name/value 도 함께 전달되어야 하니 hidden input 삽입
        const name = btnRef.current?.name;
        const value = btnRef.current?.value;
        if (name) {
          const hid = document.createElement("input");
          hid.type = "hidden";
          hid.name = name;
          hid.value = value ?? "";
          hid.setAttribute("data-confirm-injected", "1");
          form.appendChild(hid);
        }
        // requestSubmit 가 폼 validity 검사를 통과시키지 않으면 작동 안 함 — 안전
        form.requestSubmit();
      }
    });
  }

  return (
    <>
      <button
        {...rest}
        ref={btnRef}
        type="button"
        onClick={(e) => {
          // 외부에서 받은 onClick 도 보존
          rest.onClick?.(e);
          setOpen(true);
        }}
      >
        {children}
      </button>
      {open && mounted &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="modal-card" role="dialog" aria-modal="true">
              <div className="modal-body">
                <p className="modal-message">{message}</p>
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
                  onClick={confirm}
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
