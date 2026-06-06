"use client";

import { usePathname } from "next/navigation";
import { Home, MessageSquare, User, Users } from "lucide-react";

// 학부모 하단 탭바 (client) — pathname 따라 active 자동. chatUnread 받아 [문의] 탭에 뱃지.
export default function PortalTabbarClient({ chatUnread = 0 }: { chatUnread?: number }) {
  const pathname = usePathname() ?? "/parent";
  const tabs = [
    { key: "home", label: "홈", href: "/parent", icon: Home, match: (p: string) => p === "/parent", badge: 0 },
    { key: "child", label: "자녀", href: "/parent/child", icon: Users, match: (p: string) => p.startsWith("/parent/child"), badge: 0 },
    { key: "chat", label: "문의", href: "/parent/chat", icon: MessageSquare, match: (p: string) => p.startsWith("/parent/chat"), badge: chatUnread },
    { key: "me", label: "나", href: "/parent/me", icon: User, match: (p: string) => p.startsWith("/parent/me"), badge: 0 },
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
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -8,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    borderRadius: 8,
                    background: "#b42318",
                    color: "#fff",
                    fontSize: 10,
                    fontWeight: 800,
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    boxSizing: "border-box",
                  }}
                >
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
