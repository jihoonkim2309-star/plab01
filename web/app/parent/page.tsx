import { Bell, ChevronRight, Calendar, Wallet, FileText } from "lucide-react";
import PortalTabbar from "./PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type HomeChild = {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
  nextClass: string | null;
};

type HomeNotice = {
  id: string;
  title: string;
  time: string;
  unread: boolean;
};

type HomeBilling = {
  dueDate: string | null;
  amount: number;
  unpaidCount: number;
};

const MOCK_CHILDREN: HomeChild[] = [
  { id: "1", name: "박도윤", school: "한빛초", grade: "3학년", nextClass: "오늘 16:00 정규반 A" },
];

const MOCK_NOTICES: HomeNotice[] = [
  { id: "n1", title: "본사 시스템 점검 안내", time: "2시간 전", unread: true },
  { id: "n2", title: "이번 달 휴강일 안내", time: "어제", unread: false },
];

const MOCK_BILLING: HomeBilling = {
  dueDate: "2026-06-25",
  amount: 320000,
  unpaidCount: 1,
};

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function relativeTime(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일 전`;
  return d.toISOString().slice(0, 10);
}

function formatKRW(n: number): string {
  return "₩ " + n.toLocaleString("ko-KR");
}

function formatDueDate(iso: string | null): string {
  if (!iso) return "—";
  return iso.replace(/^(\d{4})-(\d{2})-(\d{2}).*$/, "$1.$2.$3");
}

async function fetchHome(): Promise<{
  children: HomeChild[];
  notices: HomeNotice[];
  billing: HomeBilling;
  pendingCount: number;
}> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) {
    return { children: MOCK_CHILDREN, notices: MOCK_NOTICES, billing: MOCK_BILLING, pendingCount: 0 };
  }
  const { supabase, userId } = guard;

  // pending 신청 개수 (홈 상단 안내용)
  const { data: pendingRows } = await supabase
    .from("parent_student_links")
    .select("id")
    .eq("parent_id", userId)
    .eq("status", "pending");
  const pendingCount = (pendingRows ?? []).length;

  // 1. 자녀 (parent_student_links + students + class)
  const { data: linkRows } = await supabase
    .from("parent_student_links")
    .select("student_id, students(id, name, school, grade, class_id, class_name)")
    .eq("parent_id", userId)
    .eq("status", "linked")
    .not("student_id", "is", null);
  type LR = {
    student_id: string;
    students: {
      id: string;
      name: string;
      school: string | null;
      grade: string | null;
      class_id: string | null;
      class_name: string | null;
    } | null;
  };
  const childStudents = ((linkRows ?? []) as unknown as LR[])
    .map((r) => r.students)
    .filter((s): s is NonNullable<LR["students"]> => !!s);

  // class meta (요일/시간) 조회 — 오늘 수업 있는지 표시
  const classIds = Array.from(
    new Set(childStudents.map((s) => s.class_id).filter((x): x is string => !!x)),
  );
  type ClassRow = {
    id: string;
    name: string;
    days_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
  };
  const classMap = new Map<string, ClassRow>();
  if (classIds.length > 0) {
    const { data: cl } = await supabase
      .from("classes")
      .select("id, name, days_of_week, start_time, end_time")
      .in("id", classIds);
    for (const c of (cl ?? []) as ClassRow[]) classMap.set(c.id, c);
  }
  const todayLabel = DAYS[new Date().getDay()];
  const children: HomeChild[] = childStudents.slice(0, 3).map((s) => {
    let nextClass: string | null = null;
    if (s.class_id) {
      const c = classMap.get(s.class_id);
      if (c) {
        const dows = (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean);
        if (dows.includes(todayLabel) && c.start_time) {
          const hhmm = c.start_time.slice(0, 5);
          nextClass = `오늘 ${hhmm} ${c.name}`;
        } else if (s.class_name) {
          nextClass = s.class_name;
        } else {
          nextClass = c.name;
        }
      } else if (s.class_name) {
        nextClass = s.class_name;
      }
    } else if (s.class_name) {
      nextClass = s.class_name;
    }
    return {
      id: s.id,
      name: s.name,
      school: s.school,
      grade: s.grade,
      nextClass,
    };
  });

  // 2. 알림 (announcements 최근 2건)
  const { data: anc } = await supabase
    .from("announcements")
    .select("id, title, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(2);
  type NR = { id: string; title: string; published_at: string | null };
  const notices: HomeNotice[] = ((anc ?? []) as NR[]).map((n, idx) => {
    const ms = n.published_at ? Date.now() - new Date(n.published_at).getTime() : 0;
    return {
      id: n.id,
      title: n.title,
      time: relativeTime(n.published_at),
      unread: idx === 0 && ms < 24 * 60 * 60 * 1000,
    };
  });

  // 3. 다음 결제 (미결제 invoices 합계 + 가장 빠른 due_date)
  //    status: '결제완료'/'환불' 외 모두 = 미결제 (대기/청구/실패 포함)
  const childIds = childStudents.map((s) => s.id);
  let billing: HomeBilling = { dueDate: null, amount: 0, unpaidCount: 0 };
  if (childIds.length > 0) {
    const { data: invs } = await supabase
      .from("invoices")
      .select("amount, due_date, status")
      .in("student_id", childIds)
      .not("status", "in", "(결제완료,환불)")
      .order("due_date", { ascending: true })
      .limit(20);
    type IR = { amount: number; due_date: string | null; status: string };
    const rows = (invs ?? []) as IR[];
    if (rows.length > 0) {
      const sum = rows.reduce((a, r) => a + (r.amount ?? 0), 0);
      const earliestDue = rows.find((r) => !!r.due_date)?.due_date ?? null;
      billing = { dueDate: earliestDue, amount: sum, unpaidCount: rows.length };
    }
  }

  return { children, notices, billing, pendingCount };
}

export default async function ParentHome() {
  const { children, notices, billing, pendingCount } = await fetchHome();
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
              {pendingCount > 0 ? (
                <>
                  <div style={{ padding: "12px 14px", background: "#fef3c7", color: "#d97706", borderRadius: 10, fontSize: 12, fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
                    ⏳ 자녀 연결 신청 {pendingCount}건이 지점 확인 대기 중입니다.
                  </div>
                  <a href="/parent/child" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                    신청 상태 보기
                  </a>
                </>
              ) : (
                <>
                  <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 8 }}>
                    아직 연결된 자녀가 없습니다.
                  </p>
                  <a href="/parent/child/new" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                    자녀 연결 신청
                  </a>
                </>
              )}
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
          {notices.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>새 알림이 없습니다.</p>
          ) : (
            notices.map((n) => (
              <a key={n.id} href={`/parent/notices/${n.id}`} className="notice-row">
                {n.unread && <span className="notice-dot" />}
                <div style={{ flex: 1 }}>
                  <div className={`notice-title${n.unread ? " unread" : ""}`}>{n.title}</div>
                  <div className="notice-time">{n.time}</div>
                </div>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))
          )}
        </section>

        {/* 결제 안내 */}
        <section className="card billing-card">
          {billing.unpaidCount === 0 ? (
            <>
              <div className="billing-meta">
                <span>다음 결제</span>
                <strong>미결제 없음</strong>
              </div>
              <div className="billing-amount">
                <span>예상 금액</span>
                <strong>—</strong>
              </div>
              <a href="/parent/billing" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
                결제 내역
              </a>
            </>
          ) : (
            <>
              <div className="billing-meta">
                <span>다음 결제일</span>
                <strong>{formatDueDate(billing.dueDate)}</strong>
              </div>
              <div className="billing-amount">
                <span>{billing.unpaidCount > 1 ? `미결제 ${billing.unpaidCount}건 합계` : "예상 금액"}</span>
                <strong>{formatKRW(billing.amount)}</strong>
              </div>
              <a href="/parent/billing" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none", marginTop: 12 }}>
                결제 상세
              </a>
            </>
          )}
        </section>
      </div>

      <PortalTabbar />
    </>
  );
}
