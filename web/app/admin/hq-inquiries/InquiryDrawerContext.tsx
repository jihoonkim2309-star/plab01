"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  inquiryId: string | null;
  setInquiryId: (id: string | null) => void;
}>({
  inquiryId: null,
  setInquiryId: () => {},
});

export function InquiryDrawerProvider({
  initialId,
  children,
}: {
  initialId?: string | null;
  children: ReactNode;
}) {
  const [inquiryId, setInquiryId] = useState<string | null>(initialId ?? null);
  return (
    <ctx.Provider value={{ inquiryId, setInquiryId }}>{children}</ctx.Provider>
  );
}

export const useInquiryDrawer = () => useContext(ctx);
