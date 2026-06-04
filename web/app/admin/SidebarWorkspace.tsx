"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { setActiveCenter, unsetActiveCenter } from "./actions-center";

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

  // 일반 admin/coach: 전환 불가 — 슬림 정적 라벨로 표시.
  if (!isSuper) {
    return (
      <div
        className="sidebar-workspace sidebar-workspace-static"
        title={`현재 지점: ${activeCenterName}`}
      >
        <span className="sw-icon" aria-hidden>
          <Building2 size={16} strokeWidth={1.75} />
        </span>
        <span className="sw-name">{activeCenterName}</span>
      </div>
    );
  }

  // super_admin: 클릭 시 지점 전환 드롭다운 (한 줄 슬림 chip)
  return (
    <div className="sidebar-workspace" ref={ref}>
      <button
        type="button"
        className="sidebar-workspace-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="슈퍼 어드민 · 지점 전환"
      >
        <span className="sw-icon" aria-hidden>
          <Building2 size={16} strokeWidth={1.75} />
        </span>
        <span className="sw-name">{activeCenterName}</span>
        <span className="sw-caret" aria-hidden>
          <ChevronDown size={14} strokeWidth={2} />
        </span>
      </button>
      {open && (
        <div className="sidebar-workspace-dropdown" role="menu">
          <form action={unsetActiveCenter} data-no-loading="true">
            <button
              type="submit"
              className={`sw-item${!activeCenterId ? " sw-item-active" : ""}`}
              role="menuitem"
              title="대시보드의 지점 선택 화면으로 돌아갑니다"
            >
              <span className="muted" style={{ fontSize: 12 }}>
                프랜차이즈 관리 (지점 미선택)
              </span>
              {!activeCenterId && (
                <span className="sw-check" aria-hidden>
                  <Check size={14} strokeWidth={2.25} />
                </span>
              )}
            </button>
          </form>
          <div className="profile-dropdown-divider" />
          {centers.map((c) => (
            <form action={setActiveCenter} data-no-loading="true" key={c.id}>
              <input type="hidden" name="center_id" value={c.id} />
              <button
                type="submit"
                className={`sw-item${c.id === activeCenterId ? " sw-item-active" : ""}`}
                role="menuitem"
              >
                {c.name}
                {c.id === activeCenterId && (
                  <span className="sw-check" aria-hidden>
                  <Check size={14} strokeWidth={2.25} />
                </span>
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
