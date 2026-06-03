import { Bell, ChevronRight, Calendar, Wallet, FileText } from "lucide-react";
import PortalTabbar from "./PortalTabbar";

// Phase 1: mock data 로 UI 구현. 인증·DB 연동은 다음 phase.
const MOCK_CHILDREN = [
  { id: "1", name: "박도윤", school: "한빛초", grade: "3학년", nextClass: "오늘 16:00 정규반 A", shuttle: "이용" },
];

const MOCK_NOTICES = [
  { id: "n1", title: "본사 시스템 점검 안내", time: "2시간 전", unread: true },
  { id: "n2", title: "이번 달 휴강일 안내", time: "어제", unread: false },
];

export default function ParentHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 학부모</h1>
        <button
          type="button"
          aria-label="알림"
          style={{ background: "transparent", border: 0, color: "#fff", padding: 4, cursor: "pointer" }}
        >
          <Bell size={20} />
        </button>
      </div>

      <div className="portal-content">
        {/* 오늘의 자녀 */}
        <section className="card">
          <div className="card-head">
            <strong>오늘의 자녀</strong>
            <a href="/parent/child" className="card-more">전체 보기 <ChevronRight size={14} /></a>
          </div>
          {MOCK_CHILDREN.map((c) => (
            <a key={c.id} href={`/parent/child/${c.id}`} className="child-row">
              <div className="avatar">{c.name.slice(0, 1)}</div>
              <div style={{ flex: 1 }}>
                <div className="child-name">
                  {c.name} <span className="child-meta">{c.school} · {c.grade}</span>
                </div>
                <div className="child-next">{c.nextClass}</div>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </a>
          ))}
        </section>

        {/* 빠른 메뉴 */}
        <section className="quick-grid">
          <a href="/parent/schedule" className="quick-item">
            <Calendar size={22} />
            <span>시간표</span>
          </a>
          <a href="/parent/billing" className="quick-item">
            <Wallet size={22} />
            <span>결제</span>
          </a>
          <a href="/parent/reports" className="quick-item">
            <FileText size={22} />
            <span>리포트</span>
          </a>
        </section>

        {/* 알림·공지 */}
        <section className="card">
          <div className="card-head">
            <strong>알림</strong>
            <a href="/parent/notices" className="card-more">전체 보기 <ChevronRight size={14} /></a>
          </div>
          {MOCK_NOTICES.map((n) => (
            <a key={n.id} href={`/parent/notices/${n.id}`} className="notice-row">
              {n.unread && <span className="notice-dot" />}
              <div style={{ flex: 1 }}>
                <div className={`notice-title${n.unread ? " unread" : ""}`}>{n.title}</div>
                <div className="notice-time">{n.time}</div>
              </div>
              <ChevronRight size={14} color="#9ca3af" />
            </a>
          ))}
        </section>

        {/* 결제 안내 (다음 결제일) */}
        <section className="card billing-card">
          <div className="billing-meta">
            <span>다음 결제일</span>
            <strong>2026.06.25</strong>
          </div>
          <div className="billing-amount">
            <span>예상 금액</span>
            <strong>₩ 320,000</strong>
          </div>
          <a href="/parent/billing" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
            결제 상세
          </a>
        </section>
      </div>

      <PortalTabbar />
    </>
  );
}
