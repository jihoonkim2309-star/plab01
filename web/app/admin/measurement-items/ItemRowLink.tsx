"use client";

import { type ReactNode, type CSSProperties } from "react";
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
  const { setItemId } = useItemDrawer();
  return (
    <a
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
