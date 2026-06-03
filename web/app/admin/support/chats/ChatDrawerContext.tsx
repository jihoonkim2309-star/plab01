"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  chatId: string | null;
  setChatId: (id: string | null) => void;
}>({
  chatId: null,
  setChatId: () => {},
});

export function ChatDrawerProvider({
  initialId,
  children,
}: {
  initialId?: string | null;
  children: ReactNode;
}) {
  const [chatId, setChatId] = useState<string | null>(initialId ?? null);
  return <ctx.Provider value={{ chatId, setChatId }}>{children}</ctx.Provider>;
}

export const useChatDrawer = () => useContext(ctx);
