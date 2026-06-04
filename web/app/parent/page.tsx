import { Bell, ChevronRight, Calendar, Wallet, FileText } from "lucide-react";
import PortalTabbar from "./PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type HomeChild = { id: string; name: string; school: string | null; grade: string | null; nextClass: string | null };

const MOCK_CHILDREN: HomeChild[] = [
  { id: "1", name: "박도윤", school: "한빛초", grade: "3학년", nextClass: "오늘 16:00 정규반 A" },
];

async function fetchHomeChildren(): Promise<HomeChild[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK_CHILDREN;
  const { supabase, userId } = guard;
  const { data } = await supabase
    .from("parent_student_links")
    .select("student_id, students(id, name, school, grade, class_name)")
    .eq("parent_id", userId)
    .eq("status", "linked")
    .not("student_id", "is", null)
    .limit(3);
  type R = { student_id: string; students: { id: string; name: string; school: string | null; grade: string | null; class_name: string | null } | null };
  return ((data ?? []) as unknown as R[])
    .filter((r) => !!r.students)
    .map((r) => ({
      id: r.students!.id,
      name: r.students!.name,
      school: r.students!.school,
      grade: r.students!.grade,
      nextClass: r.students!.class_name,
    }));
}

const MOCK_NOTICES = [
  { id: "n1", title: "본사 시스템 점검 안내", time: "2시간 전", unread: true },
  { id: "n2", title: "이번 달 휴강일 안내", time: "어제", unread: false },
];

export default async function ParentHome() {
  const children = await fetchHomeChildren();
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
          {children.length === 0 ? (
            <div style={{ padding: "8px 0" }}>
              <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 8 }}>
                아직 연결된 자녀가 없습니다.
              </p>
              <a href="/parent/child/new" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                자녀 연결 신청
              </a>
            </div>
          ) : (
            children.map((c) => (
              <a key={c.id} href={`/parent/child/${c.id}`} className="child-row">
                <div className="avatar">{c.name.slice(0, 1)}</div>
                <div style={{ flex: 1 }}>
                  <div className="child-name">
                    {c.name}
                    {(c.school || c.grade) && (
                      <span className="child-meta">{c.school ?? ""}{c.school && c.grade ? " · " : ""}{c.grade ?? ""}</span>
                    )}
                  </div>
                  {c.nextClass && <div className="child-next">{c.nextClass}</div>}
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </a>
            ))
          )}
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
