"use client";

import { usePathname } from "next/navigation";
import { Home, MessageSquare, User, Users } from "lucide-react";

// 학부모 하단 탭바 — pathname 따라 active 자동.
// /preview iframe 안에서도 같은 origin path 로 동작.
export default function PortalTabbar() {
  const pathname = usePathname() ?? "/parent";
  const tabs = [
    { key: "home", label: "홈", href: "/parent", icon: Home, match: (p: string) => p === "/parent" },
    { key: "child", label: "자녀", href: "/parent/child", icon: Users, match: (p: string) => p.startsWith("/parent/child") },
    { key: "chat", label: "문의", href: "/parent/chat", icon: MessageSquare, match: (p: string) => p.startsWith("/parent/chat") },
    { key: "me", label: "나", href: "/parent/me", icon: User, match: (p: string) => p.startsWith("/parent/me") },
  ] as const;
  // embed 모드면 query 보존 (iframe 안에서 클릭 시 frame 안 유지)
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
