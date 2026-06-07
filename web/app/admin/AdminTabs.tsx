"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { X, Building2, Users, UserCog, BookOpen, CalendarDays, Wallet, FileText, Bus, Megaphone, MessageSquare, Bell, Settings, Tag, type LucideIcon } from "lucide-react";

const ICON_MAP: Record<string, LucideIcon> = {
  Building2, Users, UserCog, BookOpen, CalendarDays, Wallet,
  FileText, Bus, Megaphone, MessageSquare, Bell, Settings, Tag,
};

function detectInFrame(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const sp = new URLSearchParams(window.location.search);
    return sp.get("frame") === "1";
  } catch {
    return false;
  }
}

const STORAGE_PREFIX = "plab01.admin.tabs.v2.";
const MAX_TABS = 10;
function storageKey(centerId: string | null) {
  return `${STORAGE_PREFIX}${centerId ?? "none"}`;
}

export type AdminTab = {
  id: string;
  href: string;
  label: string;
  icon?: string; // ICON_MAP key
};

type Ctx = {
  tabs: AdminTab[];
  activeId: string | null;
  openTab: (href: string, label: string, icon?: string) => void;
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

function persist(centerId: string | null, tabs: AdminTab[], activeId: string | null) {
  try {
    localStorage.setItem(storageKey(centerId), JSON.stringify({ tabs, activeId }));
  } catch {
    /* ignore */
  }
}

function restore(centerId: string | null): { tabs: AdminTab[]; activeId: string | null } {
  if (typeof window === "undefined") return { tabs: [], activeId: null };
  try {
    const raw = localStorage.getItem(storageKey(centerId));
    if (!raw) return { tabs: [], activeId: null };
    const parsed = JSON.parse(raw) as { tabs?: AdminTab[]; activeId?: string | null };
    if (!Array.isArray(parsed.tabs)) return { tabs: [], activeId: null };
    return { tabs: parsed.tabs.slice(0, MAX_TABS), activeId: parsed.activeId ?? null };
  } catch {
    return { tabs: [], activeId: null };
  }
}

export function AdminTabsProvider({ children, initialLabel: _initialLabel, centerId = null }: { children: ReactNode; initialLabel: string; centerId?: string | null }) {
  // SSR-safe — 초기 빈 상태, mount 후 detect + restore
  const [tabs, setTabs] = useState<AdminTab[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [inFrame, setInFrame] = useState(false);
  const lastCenterRef = useRef<string | null>(centerId);

  useEffect(() => {
    const f = detectInFrame();
    setInFrame(f);
    if (!f) {
      const r = restore(centerId);
      setTabs(r.tabs);
      setActiveId(r.activeId);
    }
    setMounted(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // centerId 변경 = 무조건 초기화 (이전 지점 탭 전부 제거, 새 지점은 빈 상태로 시작)
  useEffect(() => {
    if (!mounted || inFrame) return;
    if (lastCenterRef.current !== centerId) {
      // 이전 지점 storage 도 지움 — 무조건 초기화 의도
      try {
        if (lastCenterRef.current !== null) {
          localStorage.removeItem(storageKey(lastCenterRef.current));
        }
      } catch {
        /* ignore */
      }
      setTabs([]);
      setActiveId(null);
      lastCenterRef.current = centerId;
    }
  }, [centerId, mounted, inFrame]);

  useEffect(() => {
    if (inFrame) return;
    if (mounted) persist(centerId, tabs, activeId);
  }, [tabs, activeId, mounted, inFrame, centerId]);

  const openTab = useCallback((href: string, label: string, icon?: string) => {
    if (inFrame) return;
    const id = idFromHref(href);
    setTabs((prev) => {
      if (prev.some((t) => t.id === id)) return prev;
      if (prev.length >= MAX_TABS) {
        // 가장 오래된 (비활성) 탭 제거 — 활성 탭은 보존
        const idx = prev.findIndex((t) => t.id !== activeId);
        if (idx === -1) return prev;
        const next = [...prev];
        next.splice(idx, 1);
        next.push({ id, href, label, icon });
        return next;
      }
      return [...prev, { id, href, label, icon }];
    });
    setActiveId(id);
  }, [activeId, inFrame]);

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
  const [inFrame, setInFrame] = useState(false);
  useEffect(() => { setInFrame(detectInFrame()); }, []);
  const { tabs, activeId, closeTab, closeAll, setActive } = useAdminTabs();

  if (inFrame) return null;
  if (tabs.length === 0) return null;

  return (
    <div className="admin-tabbar">
      <div className="admin-tabbar-inner">
        {tabs.map((t) => {
          const on = t.id === activeId;
          const Icon = t.icon ? ICON_MAP[t.icon] : null;
          return (
            <div key={t.id} className={`admin-tab${on ? " active" : ""}`} onClick={() => setActive(t.id)} title={t.label}>
              {Icon && (
                <span className="admin-tab-icon" aria-hidden>
                  <Icon size={13} />
                </span>
              )}
              <span className="admin-tab-label">{t.label}</span>
              <span
                className="admin-tab-close"
                aria-label="닫기"
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(t.id);
                }}
              >
                <X size={13} />
              </span>
            </div>
          );
        })}
        {tabs.length > 1 && (
          <button type="button" className="admin-tabbar-clear" onClick={closeAll}>전체 닫기</button>
        )}
      </div>
    </div>
  );
}

// activeId 가 null 이면 children (대시보드 홈) 표시. 활성 탭이 있으면 그 iframe 만 visible.
// frame 모드 (iframe 안) 에서는 children 만 — 탭/iframe 중첩 방지.
export function AdminTabContent({ children }: { children: ReactNode }) {
  const [inFrame, setInFrame] = useState(false);
  useEffect(() => { setInFrame(detectInFrame()); }, []);
  const { tabs, activeId } = useAdminTabs();

  if (inFrame) {
    return <div className="admin-tab-content"><div className="admin-tab-panel">{children}</div></div>;
  }

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
