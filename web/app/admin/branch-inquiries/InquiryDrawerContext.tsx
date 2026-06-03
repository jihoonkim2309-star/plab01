"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

// id 가 string 이거나 'new' (신규 작성 모드) 또는 null (선택 안 함)
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
