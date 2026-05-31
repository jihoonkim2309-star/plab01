"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  invoiceId: string | null;
  setInvoiceId: (id: string | null) => void;
}>({
  invoiceId: null,
  setInvoiceId: () => {},
});

export function PaymentDrawerProvider({ children }: { children: ReactNode }) {
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  return (
    <ctx.Provider value={{ invoiceId, setInvoiceId }}>{children}</ctx.Provider>
  );
}

export const usePaymentDrawer = () => useContext(ctx);
