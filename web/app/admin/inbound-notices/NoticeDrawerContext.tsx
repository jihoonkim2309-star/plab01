"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  noticeId: string | null;
  setNoticeId: (id: string | null) => void;
}>({
  noticeId: null,
  setNoticeId: () => {},
});

export function NoticeDrawerProvider({
  initialId,
  children,
}: {
  initialId?: string | null;
  children: ReactNode;
}) {
  const [noticeId, setNoticeId] = useState<string | null>(initialId ?? null);
  return (
    <ctx.Provider value={{ noticeId, setNoticeId }}>{children}</ctx.Provider>
  );
}

export const useNoticeDrawer = () => useContext(ctx);
