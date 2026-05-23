"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { signOut } from "./actions";

export default function ProfileMenu({
  initial,
  name,
  role,
  isAdmin,
}: {
  initial: string;
  name: string;
  role: string;
  isAdmin: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onEsc);
    };
  }, []);

  return (
    <div className="profile-menu" ref={ref}>
      <button
        type="button"
        className="profile-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <div className="avatar">{initial}</div>
        <div className="profile-meta">
          <span className="name">{name}</span>
          <span className="name-sub">{role}</span>
        </div>
        <span className="profile-caret" aria-hidden>▾</span>
      </button>
      {open && (
        <div className="profile-dropdown" role="menu">
          <div className="profile-dropdown-head">
            <div className="avatar" aria-hidden>{initial}</div>
            <div>
              <strong>{name}</strong>
              <span className="muted">{role}</span>
            </div>
          </div>
          <div className="profile-dropdown-divider" />
          <Link
            href="/admin/me"
            className="profile-dropdown-item"
            role="menuitem"
            onClick={() => setOpen(false)}
          >
            <span className="pdi-icon" aria-hidden>👤</span> 내 프로필
          </Link>
          {isAdmin && (
            <Link
              href="/admin/settings"
              className="profile-dropdown-item"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <span className="pdi-icon" aria-hidden>⚙</span> 센터 설정
            </Link>
          )}
          <div className="profile-dropdown-divider" />
          <form action={signOut}>
            <button
              type="submit"
              className="profile-dropdown-logout"
              role="menuitem"
            >
              로그아웃 <span aria-hidden>↗</span>
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
