"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

export default function DrawerToggle() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // admin-shell 에 drawer-open 클래스 토글
  useEffect(() => {
    const shell = document.querySelector(".admin-shell");
    if (!shell) return;
    shell.classList.toggle("drawer-open", open);
  }, [open]);

  // 페이지 이동 시 자동 닫기
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  // 백드롭 또는 사이드바 내부 링크 클릭 시 닫기
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (target.classList?.contains("drawer-backdrop")) {
        setOpen(false);
      }
    }
    document.addEventListener("click", onDoc);
    return () => document.removeEventListener("click", onDoc);
  }, []);

  // 화면이 커지면 drawer-open 클래스 정리 (반응형)
  useEffect(() => {
    function onResize() {
      if (window.innerWidth > 1100 && open) setOpen(false);
    }
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  return (
    <button
      type="button"
      className="mobile-menu-button"
      onClick={() => setOpen((v) => !v)}
      aria-label="메뉴 열기"
      aria-expanded={open}
    >
      ☰
    </button>
  );
}
