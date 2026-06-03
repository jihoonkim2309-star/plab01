import { Bell, CheckSquare, Home, MessageSquare, Ruler } from "lucide-react";

export default function CoachHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 코치</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <div
          style={{
            background: "#fff",
            borderRadius: 12,
            padding: 20,
            boxShadow: "0 1px 2px rgba(0,0,0,.04)",
          }}
        >
          <strong style={{ fontSize: 16 }}>오늘의 클래스</strong>
          <div style={{ marginTop: 12, color: "#6f7d78", fontSize: 14 }}>
            아직 정보가 없습니다.
          </div>
        </div>
      </div>
      <CoachTabbar active="home" />
    </>
  );
}

function CoachTabbar({ active }: { active: "home" | "attend" | "measure" | "chat" }) {
  const tabs = [
    { key: "home", label: "홈", href: "/coach", icon: Home },
    { key: "attend", label: "출석", href: "/coach/attendance", icon: CheckSquare },
    { key: "measure", label: "측정", href: "/coach/measurements", icon: Ruler },
    { key: "chat", label: "문의", href: "/coach/chat", icon: MessageSquare },
  ] as const;
  return (
    <nav className="portal-tabbar" style={{ ["--tabs" as never]: tabs.length }}>
      {tabs.map((t) => {
        const Icon = t.icon;
        return (
          <a key={t.key} href={t.href} className={`portal-tab${active === t.key ? " active" : ""}`}>
            <Icon size={22} />
            {t.label}
          </a>
        );
      })}
    </nav>
  );
}
