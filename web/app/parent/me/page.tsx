import { Bell, ChevronRight, LogOut, Phone, Settings, User } from "lucide-react";
import PortalTabbar from "../PortalTabbar";

export default function ParentMe() {
  return (
    <>
      <div className="portal-topbar">
        <h1>나</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>김</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>김지훈</strong>
              <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>jihoonkim2309@gmail.com</div>
            </div>
          </div>
        </section>

        <section className="card" style={{ padding: 0 }}>
          {[
            { icon: User, label: "프로필 수정", href: "/parent/me/profile" },
            { icon: Phone, label: "지점 정보", href: "/parent/me/center" },
            { icon: Settings, label: "알림 설정", href: "/parent/me/notifications" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  textDecoration: "none",
                  color: "#111",
                  borderTop: "1px solid #f1f5f4",
                }}
              >
                <Icon size={18} color="#6f7d78" />
                <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                <ChevronRight size={16} color="#9ca3af" />
              </a>
            );
          })}
        </section>

        <section className="card">
          <a
            href="/login"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              padding: "10px 0",
              textDecoration: "none",
              color: "#b42318",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            <LogOut size={16} />
            로그아웃
          </a>
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
