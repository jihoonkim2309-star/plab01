"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  postId: string | null;
  setPostId: (id: string | null) => void;
}>({
  postId: null,
  setPostId: () => {},
});

export function PostDrawerProvider({
  initialId,
  children,
}: {
  initialId?: string | null;
  children: ReactNode;
}) {
  const [postId, setPostId] = useState<string | null>(initialId ?? null);
  return <ctx.Provider value={{ postId, setPostId }}>{children}</ctx.Provider>;
}

export const usePostDrawer = () => useContext(ctx);
