"use client";

import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";

export type TabbarItem = {
  key: string;
  label: string;
  href: string;
  icon: LucideIcon;
  match: (pathname: string) => boolean;
};

// 포털 공통 하단 탭바. embed=1 query 보존.
export default function Tabbar({ tabs }: { tabs: TabbarItem[] }) {
  const pathname = usePathname() ?? "";
  const search = typeof window !== "undefined" ? window.location.search : "";
  return (
    <nav className="portal-tabbar" style={{ ["--tabs" as never]: tabs.length }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = t.match(pathname);
        return (
          <a key={t.key} href={`${t.href}${search}`} className={`portal-tab${on ? " active" : ""}`}>
            <Icon size={20} />
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}
