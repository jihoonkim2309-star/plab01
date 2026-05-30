"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { useStudentDrawer } from "./StudentDrawerContext";

// 학생 row 클릭 시 URL 변경 없이 drawer 열기.
// 새 탭/수정자 키 (Ctrl/Cmd 등) 는 기본 동작 유지.
export default function StudentRowLink({
  studentId,
  href,
  className,
  style,
  children,
}: {
  studentId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { studentId: activeId, setStudentId } = useStudentDrawer();
  const ref = useRef<HTMLAnchorElement>(null);
  const isActive = activeId === studentId;

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
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        if (e.button !== 0) return;
        e.preventDefault();
        setStudentId(studentId);
      }}
    >
      {children}
    </a>
  );
}
