"use client";

import { usePathname } from "next/navigation";
import { Home, User, MessageSquare, UserCheck } from "lucide-react";

export default function StudentTabbarClient({ chatUnread = 0 }: { chatUnread?: number }) {
  const pathname = usePathname() ?? "/student";
  const tabs = [
    { key: "home", label: "홈", href: "/student", icon: Home, match: (p: string) => p === "/student", badge: 0 },
    { key: "connect", label: "본인", href: "/student/connect", icon: UserCheck, match: (p: string) => p.startsWith("/student/connect"), badge: 0 },
    { key: "chat", label: "문의", href: "/student/chat", icon: MessageSquare, match: (p: string) => p.startsWith("/student/chat"), badge: chatUnread },
    { key: "me", label: "나", href: "/student/me", icon: User, match: (p: string) => p.startsWith("/student/me"), badge: 0 },
  ] as const;
  const search = typeof window !== "undefined" ? window.location.search : "";
  return (
    <nav className="portal-tabbar" style={{ ["--tabs" as never]: tabs.length }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        const on = t.match(pathname);
        return (
          <a key={t.key} href={`${t.href}${search}`} className={`portal-tab${on ? " active" : ""}`}>
            <span style={{ position: "relative", display: "inline-flex" }}>
              <Icon size={20} />
              {t.badge > 0 && (
                <span style={{ position: "absolute", top: -4, right: -8, minWidth: 16, height: 16, padding: "0 4px", borderRadius: 8, background: "#b42318", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", boxSizing: "border-box" }}>
                  {t.badge > 99 ? "99+" : t.badge}
                </span>
              )}
            </span>
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}
