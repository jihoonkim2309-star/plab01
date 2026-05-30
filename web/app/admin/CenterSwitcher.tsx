"use client";

import { useEffect, useRef, useState } from "react";
import { Building2, ChevronDown, Check } from "lucide-react";
import { setActiveCenter } from "./actions-center";

export default function CenterSwitcher({
  centers,
  activeCenterId,
}: {
  centers: { id: string; name: string }[];
  activeCenterId: string | null;
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

  const active =
    centers.find((c) => c.id === activeCenterId) ?? centers[0] ?? null;

  return (
    <div className="center-switcher" ref={ref}>
      <button
        type="button"
        className="center-switcher-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        title="지점 전환"
      >
        <span className="cs-icon" aria-hidden>
          <Building2 size={16} strokeWidth={1.75} />
        </span>
        <span className="cs-label">{active?.name ?? "지점 선택"}</span>
        <span className="cs-caret" aria-hidden>
          <ChevronDown size={14} strokeWidth={2} />
        </span>
      </button>
      {open && (
        <div className="center-switcher-dropdown" role="menu">
          <div className="cs-head">
            <strong>지점 전환</strong>
            <span className="muted">선택한 지점 컨텍스트로 모든 화면이 동작합니다.</span>
          </div>
          {centers.map((c) => (
            <form action={setActiveCenter} key={c.id} data-no-loading="true">
              <input type="hidden" name="center_id" value={c.id} />
              <button
                type="submit"
                className={`cs-item${c.id === active?.id ? " cs-item-active" : ""}`}
                role="menuitem"
              >
                {c.name}
                {c.id === active?.id && (
                  <span className="cs-check" aria-hidden>
                    <Check size={14} strokeWidth={2.25} />
                  </span>
                )}
              </button>
            </form>
          ))}
          {centers.length === 0 && (
            <div className="cs-empty">등록된 지점이 없습니다.</div>
          )}
        </div>
      )}
    </div>
  );
}
