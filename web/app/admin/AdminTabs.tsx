"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "plab01.admin.tabs.v1";
const MAX_TABS = 10;

export type AdminTab = {
  id: string;
  href: string;
  label: string;
};

type Ctx = {
  tabs: AdminTab[];
  activeId: string | null;
  openTab: (href: string, label: string) => void;
  closeTab: (id: string) => void;
  closeAll: () => void;
  setActive: (id: string) => void;
};

const TabsContext = createContext<Ctx | null>(null);

export function useAdminTabs(): Ctx {
  const ctx = useContext(TabsContext);
  if (!ctx) throw new Error("AdminTabsProvider 안에서만 사용");
  return ctx;
}

function idFromHref(href: string) {
  return href.replace(/[?#].*$/, "");
}

function persist(tabs: AdminTab[], activeId: string | null) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ tabs, activeId }));
  } catch {
    /* ignore */
  }
}

function restore(): { tabs: AdminTab[]; activeId: string | null } {
  if (typeof window === "undefined") return { tabs: [], activeId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { tabs: [], activeId: null };
    const parsed = JSON.parse(raw) as { tabs?: AdminTab[]; activeId?: string | null };
    if (!Array.isArray(parsed.tabs)) return { tabs: [], activeId: null };
    return { tabs: parsed.tabs.slice(0, MAX_TABS), activeId: parsed.activeId ?? null };
  } catch {
    return { tabs: [], activeId: null };
  }
}

export function AdminTabsProvider({ children, initialLabel: _initialLabel }: { children: ReactNode; initialLabel: string }) {
  const [tabs, setTabs] = useState<AdminTab[]>(() => restore().tabs);
  const [activeId, setActiveId] = useState<string | null>(() => restore().activeId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) persist(tabs, activeId);
  }, [tabs, activeId, mounted]);

  const openTab = useCallback((href: string, label: string) => {
    const id = idFromHref(href);
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      if (prev.length >= MAX_TABS) {
        // 가장 오래된 (비활성) 탭 제거 — 활성 탭은 보존
        const idx = prev.findIndex((t) => t.id !== activeId);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        next.push({ id, href, label });
        return next;
      }
      return [...prev, { id, href, label }];
    });
    setActiveId(id);
  }, [activeId]);

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      const idx = prev.findIndex((t) => t.id === id);
      if (idx === -1) return prev;
      const next = prev.filter((t) => t.id !== id);
      if (id === activeId && next.length > 0) {
        const fallback = next[Math.max(0, idx - 1)] ?? next[0];
        setActiveId(fallback.id);
      } else if (next.length === 0) {
        setActiveId(null);
      }
      return next;
    });
  }, [activeId]);

  const closeAll = useCallback(() => {
    setTabs([]);
    setActiveId(null);
  }, []);

  const setActive = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const value: Ctx = useMemo(() => ({ tabs, activeId, openTab, closeTab, closeAll, setActive }), [tabs, activeId, openTab, closeTab, closeAll, setActive]);

  return <TabsContext.Provider value={value}>{children}</TabsContext.Provider>;
}

export function AdminTabBar() {
  const { tabs, activeId, closeTab, closeAll, setActive } = useAdminTabs();

  if (tabs.length === 0) return null;

  return (
    <div className="admin-tabbar">
      <div className="admin-tabbar-scroll">
        {tabs.map((t) => {
          const on = t.id === activeId;
          return (
            <div key={t.id} className={`admin-tab${on ? " active" : ""}`} onClick={() => setActive(t.id)}>
              <span className="admin-tab-label">{t.label}</span>
              <button
                type="button"
                className="admin-tab-close"
                aria-label="닫기"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
              >
                <X size={12} />
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="admin-tabbar-clear" onClick={closeAll}>전체 닫기</button>
    </div>
  );
}

// activeId 가 null 이면 children (대시보드 홈) 표시. 활성 탭이 있으면 그 iframe 만 visible.
export function AdminTabContent({ children }: { children: ReactNode }) {
  const { tabs, activeId } = useAdminTabs();
  const showHome = activeId === null;

  return (
    <div className="admin-tab-content">
      <div className="admin-tab-panel" style={{ display: showHome ? "block" : "none" }}>
        {children}
      </div>
      {tabs.map((t) => {
        const sep = t.href.includes("?") ? "&" : "?";
        const src = `${t.href}${sep}frame=1`;
        return (
          <div key={t.id} className="admin-tab-panel admin-tab-frame" style={{ display: activeId === t.id ? "block" : "none" }}>
            <iframe src={src} title={t.label} />
          </div>
        );
      })}
    </div>
  );
}
