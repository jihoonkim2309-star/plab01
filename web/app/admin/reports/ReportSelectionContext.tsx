"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Ctx = {
  selected: Set<string>;
  toggle: (id: string) => void;
  setAll: (ids: string[]) => void;
  clear: () => void;
};

const SelectionContext = createContext<Ctx | null>(null);

export function ReportSelectionProvider({ children }: { children: ReactNode }) {
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const setAll = useCallback((ids: string[]) => {
    setSelected(new Set(ids));
  }, []);

  const clear = useCallback(() => setSelected(new Set()), []);

  const value = useMemo(
    () => ({ selected, toggle, setAll, clear }),
    [selected, toggle, setAll, clear],
  );

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
}

export function useReportSelection() {
  const ctx = useContext(SelectionContext);
  if (!ctx) throw new Error("ReportSelectionProvider 안에서만 사용 가능");
  return ctx;
}
