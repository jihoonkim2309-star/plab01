import { ArrowLeft, Bell, ChevronRight } from "lucide-react";
import PortalTabbar from "../PortalTabbar";

const MOCK_NOTICES = [
  { id: "n3", title: "본사 시스템 점검 안내", source: "본사", time: "2시간 전", unread: true },
  { id: "n2", title: "이번 달 휴강일 안내", source: "지점", time: "어제", unread: false },
  { id: "n1", title: "5월 리포트 발행 안내", source: "지점", time: "3일 전", unread: false },
];

export default function ParentNotices() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>알림</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          {MOCK_NOTICES.map((n) => (
            <a key={n.id} href={`/parent/notices/${n.id}`} className="notice-row">
              {n.unread && <span className="notice-dot" />}
              <div style={{ flex: 1 }}>
                <div className={`notice-title${n.unread ? " unread" : ""}`}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--brand)", marginRight: 6, padding: "1px 6px", background: "var(--brand-soft)", borderRadius: 4 }}>
                    {n.source}
                  </span>
                  {n.title}
                </div>
                <div className="notice-time">{n.time}</div>
              </div>
              <ChevronRight size={14} color="#9ca3af" />
            </a>
          ))}
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
