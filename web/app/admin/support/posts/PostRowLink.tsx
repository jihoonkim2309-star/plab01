"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { usePostDrawer } from "./PostDrawerContext";

export default function PostRowLink({
  postId,
  href,
  className,
  style,
  children,
}: {
  postId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { postId: activeId, setPostId } = usePostDrawer();
  const ref = useRef<HTMLAnchorElement>(null);
  const isActive = activeId === postId;

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
        setPostId(postId);
      }}
    >
      {children}
    </a>
  );
}
