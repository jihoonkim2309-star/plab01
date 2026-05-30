"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  itemId: string | null;
  setItemId: (id: string | null) => void;
}>({
  itemId: null,
  setItemId: () => {},
});

export function ItemDrawerProvider({ children }: { children: ReactNode }) {
  const [itemId, setItemId] = useState<string | null>(null);
  return (
    <ctx.Provider value={{ itemId, setItemId }}>{children}</ctx.Provider>
  );
}

export const useItemDrawer = () => useContext(ctx);
