"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { useMeasurementDrawer } from "./MeasurementDrawerContext";

export default function MeasurementRowLink({
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
  const { studentId: activeId, setStudentId } = useMeasurementDrawer();
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
      data-no-loading="true"
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
