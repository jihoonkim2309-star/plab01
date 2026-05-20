"use client";

import type { ButtonHTMLAttributes } from "react";

// 파괴적 액션 확인 다이얼로그 공통화.
// 같은 form 안 submit 버튼에 적용하면 confirm() 거절 시 submit 가 막힌다.
export default function ConfirmButton({
  message,
  children,
  ...rest
}: { message: string; children: React.ReactNode } & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
        if (rest.onClick) rest.onClick(e);
      }}
    >
      {children}
    </button>
  );
}
