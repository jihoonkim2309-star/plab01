"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  classId: string | null;
  setClassId: (id: string | null) => void;
}>({
  classId: null,
  setClassId: () => {},
});

export function ClassDrawerProvider({ children }: { children: ReactNode }) {
  const [classId, setClassId] = useState<string | null>(null);
  return <ctx.Provider value={{ classId, setClassId }}>{children}</ctx.Provider>;
}

export const useClassDrawer = () => useContext(ctx);
