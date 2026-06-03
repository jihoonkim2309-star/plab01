import { Bell, ChevronRight, LogOut, Settings, User } from "lucide-react";
import StudentTabbar from "../Tabbar";

export default function StudentMe() {
  return (
    <>
      <div className="portal-topbar">
        <h1>나</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>박</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>박도윤</strong>
              <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>한빛초 3학년 · 정규반 A</div>
            </div>
          </div>
        </section>
        <section className="card" style={{ padding: 0 }}>
          {[
            { icon: User, label: "내 프로필", href: "/student/me/profile" },
            { icon: Settings, label: "알림 설정", href: "/student/me/notifications" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a key={item.label} href={item.href} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", textDecoration: "none", color: "#111", borderTop: "1px solid #f1f5f4" }}>
                <Icon size={18} color="#6f7d78" />
                <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                <ChevronRight size={16} color="#9ca3af" />
              </a>
            );
          })}
        </section>
        <section className="card">
          <a href="/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 0", textDecoration: "none", color: "#b42318", fontWeight: 700, fontSize: 14 }}>
            <LogOut size={16} />
            로그아웃
          </a>
        </section>
      </div>
      <StudentTabbar />
    </>
  );
}
