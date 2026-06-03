import { Bell, Bus, Home, ListChecks, ScanLine } from "lucide-react";

export default function DriverHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 기사</h1>
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
          <strong style={{ fontSize: 14 }}>오늘의 운행</strong>
          <div style={{ marginTop: 12, color: "#6f7d78", fontSize: 13 }}>
            배정된 운행이 없습니다.
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
          <strong style={{ fontSize: 14 }}>승하차 QR</strong>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 8 }}>
            학생이 차량 QR 을 스캔하면 자동으로 승·하차 기록이 남습니다.
          </p>
        </div>
      </div>
      <DriverTabbar active="home" />
    </>
  );
}

function DriverTabbar({ active }: { active: "home" | "runs" | "scan" | "logs" }) {
  const tabs = [
    { key: "home", label: "홈", href: "/driver", icon: Home },
    { key: "runs", label: "운행", href: "/driver/runs", icon: Bus },
    { key: "scan", label: "스캔", href: "/driver/scan", icon: ScanLine },
    { key: "logs", label: "기록", href: "/driver/logs", icon: ListChecks },
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
