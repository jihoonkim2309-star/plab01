"use client";

import { type ReactNode, type CSSProperties } from "react";
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
  const { setClassId } = useClassDrawer();
  return (
    <a
      href={href}
      className={className}
      style={style}
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
