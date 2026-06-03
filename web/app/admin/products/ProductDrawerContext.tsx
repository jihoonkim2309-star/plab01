"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  productId: string | null;
  setProductId: (id: string | null) => void;
}>({
  productId: null,
  setProductId: () => {},
});

export function ProductDrawerProvider({
  initialId,
  children,
}: {
  initialId?: string | null;
  children: ReactNode;
}) {
  const [productId, setProductId] = useState<string | null>(initialId ?? null);
  return (
    <ctx.Provider value={{ productId, setProductId }}>{children}</ctx.Provider>
  );
}

export const useProductDrawer = () => useContext(ctx);
