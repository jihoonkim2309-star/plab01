import { Bell, Calendar, Clock, FileText, QrCode } from "lucide-react";
import StudentTabbar from "./Tabbar";

export default function StudentHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 학생</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <strong>오늘의 수업</strong>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: 10, background: "var(--brand-soft, #d8ecdf)", borderRadius: 8 }}>
            <Clock size={18} color="#1e794e" />
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>정규반 A</strong>
              <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>16:00 - 17:00 · 박코치</div>
            </div>
          </div>
        </section>

        <section className="quick-grid">
          <a href="/student/schedule" className="quick-item"><Calendar size={22} /><span>시간표</span></a>
          <a href="/student/shuttle" className="quick-item"><QrCode size={22} /><span>셔틀 QR</span></a>
          <a href="/student/reports" className="quick-item"><FileText size={22} /><span>내 리포트</span></a>
        </section>

        <section className="card">
          <strong>알림</strong>
          <a href="#" className="notice-row">
            <span className="notice-dot" />
            <div style={{ flex: 1 }}>
              <div className="notice-title unread">코치 메모: 폼이 많이 좋아졌어요</div>
              <div className="notice-time">오늘 14:20</div>
            </div>
          </a>
        </section>
      </div>
      <StudentTabbar />
    </>
  );
}
