"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

const ctx = createContext<{
  studentId: string | null;
  setStudentId: (id: string | null) => void;
}>({
  studentId: null,
  setStudentId: () => {},
});

export function MeasurementDrawerProvider({ children }: { children: ReactNode }) {
  const [studentId, setStudentId] = useState<string | null>(null);
  return (
    <ctx.Provider value={{ studentId, setStudentId }}>{children}</ctx.Provider>
  );
}

export const useMeasurementDrawer = () => useContext(ctx);
