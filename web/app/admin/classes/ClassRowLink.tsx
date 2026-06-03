"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { useClassDrawer } from "./ClassDrawerContext";

export default function ClassRowLink({
  classId,
  href,
  className,
  style,
  children,
}: {
  classId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { classId: activeId, setClassId } = useClassDrawer();
  const ref = useRef<HTMLAnchorElement>(null);
  const isActive = activeId === classId;

  // 부모 tr 의 'selected' 클래스 동기화 (좌측 row 활성 표시)
  useEffect(() => {
    const tr = ref.current?.closest("tr");
    if (!tr) return;
    if (isActive) tr.classList.add("selected");
    else tr.classList.remove("selected");
  }, [isActive]);

  return (
    <a
      ref={ref}
      href={href}
      className={className}
      style={style}
      data-no-loading="true"
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (e.button !== 0) return;
        e.preventDefault();
        setClassId(classId);
      }}
    >
      {children}
    </a>
  );
}
