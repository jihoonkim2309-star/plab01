import { Bell, Calendar, Home, QrCode, User } from "lucide-react";

export default function StudentHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 학생</h1>
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
          <strong style={{ fontSize: 14 }}>오늘의 수업</strong>
          <div style={{ marginTop: 12, color: "#6f7d78", fontSize: 13 }}>
            아직 정보가 없습니다.
          </div>
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
          <strong style={{ fontSize: 14 }}>셔틀 QR</strong>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 8 }}>
            차량 QR 을 스캔해 승·하차를 기록합니다.
          </p>
        </div>
      </div>
      <StudentTabbar active="home" />
    </>
  );
}

function StudentTabbar({ active }: { active: "home" | "schedule" | "shuttle" | "me" }) {
  const tabs = [
    { key: "home", label: "홈", href: "/student", icon: Home },
    { key: "schedule", label: "시간표", href: "/student/schedule", icon: Calendar },
    { key: "shuttle", label: "셔틀", href: "/student/shuttle", icon: QrCode },
    { key: "me", label: "나", href: "/student/me", icon: User },
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
