"use client";

import { type ReactNode, type CSSProperties, useEffect, useRef } from "react";
import { useChatDrawer } from "./ChatDrawerContext";

export default function ChatRowLink({
  chatId,
  href,
  className,
  style,
  children,
}: {
  chatId: string;
  href: string;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const { chatId: activeId, setChatId } = useChatDrawer();
  const ref = useRef<HTMLAnchorElement>(null);
  const isActive = activeId === chatId;

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
        setChatId(chatId);
      }}
    >
      {children}
    </a>
  );
}
