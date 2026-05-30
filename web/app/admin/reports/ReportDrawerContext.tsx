"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  reportId: string | null;
  setReportId: (id: string | null) => void;
}>({
  reportId: null,
  setReportId: () => {},
});

export function ReportDrawerProvider({ children }: { children: ReactNode }) {
  const [reportId, setReportId] = useState<string | null>(null);
  return (
    <ctx.Provider value={{ reportId, setReportId }}>{children}</ctx.Provider>
  );
}

export const useReportDrawer = () => useContext(ctx);
