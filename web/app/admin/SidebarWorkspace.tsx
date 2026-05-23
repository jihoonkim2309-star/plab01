"use client";

import { useEffect, useRef, useState } from "react";
import { setActiveCenter } from "./actions-center";

export default function SidebarWorkspace({
  isSuper,
  centers,
  activeCenterId,
  activeCenterName,
}: {
  isSuper: boolean;
  centers: { id: string; name: string }[];
  activeCenterId: string | null;
  activeCenterName: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDoc);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDoc);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  // 일반 admin/coach: 전환 불가 — 정적 라벨로 표시.
  if (!isSuper) {
    return (
      <div className="sidebar-workspace sidebar-workspace-static">
        <span className="sw-icon" aria-hidden>◇</span>
        <div className="sw-meta">
          <span className="sw-label">현재 지점</span>
          <span className="sw-name" title={activeCenterName}>
            {activeCenterName}
          </span>
        </div>
      </div>
    );
  }

  // super_admin: 클릭 시 지점 전환 드롭다운
  return (
    <div className="sidebar-workspace" ref={ref}>
      <button
        type="button"
        className="sidebar-workspace-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="sw-icon" aria-hidden>◇</span>
        <div className="sw-meta">
          <span className="sw-label">슈퍼 어드민 · 지점 전환</span>
          <span className="sw-name" title={activeCenterName}>
            {activeCenterName}
          </span>
        </div>
        <span className="sw-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="sidebar-workspace-dropdown" role="menu">
          {centers.map((c) => (
            <form action={setActiveCenter} key={c.id}>
              <input type="hidden" name="center_id" value={c.id} />
              <button
                type="submit"
                className={`sw-item${c.id === activeCenterId ? " sw-item-active" : ""}`}
                role="menuitem"
              >
                {c.name}
                {c.id === activeCenterId && (
                  <span className="sw-check" aria-hidden>✓</span>
                )}
              </button>
            </form>
          ))}
          {centers.length === 0 && (
            <div className="sw-empty">등록된 지점이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
