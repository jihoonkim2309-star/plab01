import { Bell, Home, MessageSquare, User } from "lucide-react";

export default function ParentHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 학부모</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 1px 2px rgba(0,0,0,.04)",
          }}
        >
          <strong style={{ fontSize: 14 }}>오늘의 자녀</strong>
          <div style={{ marginTop: 12, color: "#6f7d78", fontSize: 13 }}>
            아직 연결된 자녀가 없습니다.
          </div>
          <a
            href="/parent/link"
            className="btn primary"
            style={{ display: "block", marginTop: 12, textAlign: "center", textDecoration: "none" }}
          >
            자녀 연결 신청
          </a>
        </div>

        <div
          style={{
            marginTop: 16,
            background: "#fff",
            borderRadius: 12,
            padding: 16,
            boxShadow: "0 1px 2px rgba(0,0,0,.04)",
          }}
        >
          <strong style={{ fontSize: 14 }}>안내</strong>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 8, lineHeight: 1.5 }}>
            플랜비 학부모 앱입니다. 자녀를 연결하면 수강·시간표·셔틀·결제·리포트
            를 한눈에 확인하고 지점에 문의할 수 있습니다.
          </p>
        </div>
      </div>
      <ParentTabbar active="home" />
    </>
  );
}

export function ParentTabbar({ active }: { active: "home" | "child" | "chat" | "me" }) {
  const tabs = [
    { key: "home", label: "홈", href: "/parent", icon: Home },
    { key: "child", label: "자녀", href: "/parent/child", icon: User },
    { key: "chat", label: "문의", href: "/parent/chat", icon: MessageSquare },
    { key: "me", label: "나", href: "/parent/me", icon: User },
  ] as const;
  return (
    <nav className="portal-tabbar" style={{ ["--tabs" as never]: tabs.length }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <a key={t.key} href={t.href} className={`portal-tab${active === t.key ? " active" : ""}`}>
            <Icon size={20} />
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}
