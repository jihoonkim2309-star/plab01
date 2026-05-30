"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { useItemDrawer } from "./ItemDrawerContext";

export default function ItemRowLink({
  itemId,
  href,
  className,
  style,
  children,
}: {
  itemId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { itemId: activeId, setItemId } = useItemDrawer();
  const ref = useRef<HTMLAnchorElement>(null);
  const isActive = activeId === itemId;

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
        setItemId(itemId);
      }}
    >
      {children}
    </a>
  );
}
