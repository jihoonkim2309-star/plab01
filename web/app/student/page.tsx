import { Bell, Calendar, Clock, FileText, QrCode, ChevronRight } from "lucide-react";
import StudentTabbar from "./Tabbar";
import { requirePortal } from "@/lib/portal-auth";

type TodayClass = { name: string; time: string; coach: string | null; color: string | null };
type Notice = { id: string; title: string; time: string };

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

const MOCK_TODAY: TodayClass | null = { name: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green" };
const MOCK_NOTICES: Notice[] = [{ id: "n1", title: "코치 메모: 폼이 많이 좋아졌어요", time: "오늘 14:20" }];

async function fetchHome(): Promise<{ studentName: string | null; today: TodayClass | null; notices: Notice[]; linked: boolean; pendingCount: number }> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return { studentName: "박도윤", today: MOCK_TODAY, notices: MOCK_NOTICES, linked: true, pendingCount: 0 };
  const { supabase, userId } = guard;

  // pending 신청 개수
  const { data: pendingRows } = await supabase
    .from("student_account_links")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "pending");
  const pendingCount = (pendingRows ?? []).length;

  // 본인 student
  const { data: link } = await supabase
    .from("student_account_links")
    .select("student_id, students(id, name, class_id)")
    .eq("user_id", userId)
    .eq("status", "linked")
    .limit(1)
    .maybeSingle();
  type LR = { student_id: string; students: { id: string; name: string; class_id: string | null } | null };
  const linkRow = link as unknown as LR | null;
  if (!linkRow?.students) return { studentName: null, today: null, notices: [], linked: false, pendingCount };

  const student = linkRow.students;

  // 오늘 class
  let today: TodayClass | null = null;
  if (student.class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("name, days_of_week, start_time, end_time, coach, color")
      .eq("id", student.class_id)
      .maybeSingle();
    type CR = { name: string; days_of_week: string | null; start_time: string | null; end_time: string | null; coach: string | null; color: string | null };
    const c = cls as CR | null;
    if (c) {
      const dows = (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean);
      const todayLabel = DAYS[new Date().getDay()];
      if (dows.includes(todayLabel) && c.start_time) {
        const f = (t: string | null) => (t ? t.slice(0, 5) : "");
        today = {
          name: c.name,
          time: `${f(c.start_time)} - ${f(c.end_time)}`,
          coach: c.coach,
          color: c.color,
        };
      }
    }
  }

  // 알림 (announcements published)
  const { data: anc } = await supabase
    .from("announcements")
    .select("id, title, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(3);
  type NR = { id: string; title: string; published_at: string | null };
  const notices: Notice[] = ((anc ?? []) as NR[]).map((n) => ({
    id: n.id,
    title: n.title,
    time: relativeTime(n.published_at),
  }));

  return { studentName: student.name, today, notices, linked: true, pendingCount };
}

const COLOR_MAP: Record<string, string> = {
  green: "#1e794e",
  blue: "#2563eb",
  orange: "#d97706",
  purple: "#7c3aed",
  pink: "#db2777",
  amber: "#b45309",
};

export default async function StudentHome() {
  const { studentName, today, notices, linked, pendingCount } = await fetchHome();
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 학생</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {/* 오늘의 수업 / 본인 연결 카드 */}
        <section className="card">
          <div className="card-head">
            <strong>오늘의 수업</strong>
            <a href="/student/connect" className="card-more">본인 연결 <ChevronRight size={14} /></a>
          </div>
          {!linked ? (
            pendingCount > 0 ? (
              <>
                <div style={{ padding: "12px 14px", background: "#fef3c7", color: "#d97706", borderRadius: 10, fontSize: 13, fontWeight: 600, marginBottom: 10, lineHeight: 1.5 }}>
                  ⏳ 본인 연결 신청 {pendingCount}건이 어드민 승인 대기 중입니다.
                </div>
                <a href="/student/connect" className="btn" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                  신청 상태 보기
                </a>
              </>
            ) : (
              <div style={{ padding: "8px 0" }}>
                <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 8 }}>
                  본인 정보를 연결하면 오늘 수업이 표시됩니다.
                </p>
                <a href="/student/connect/new" className="btn primary" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
                  본인 연결 신청
                </a>
              </div>
            )
          ) : today ? (
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 12, padding: 10, background: "var(--brand-soft, #d8ecdf)", borderRadius: 8 }}>
              <Clock size={18} color={today.color ? COLOR_MAP[today.color] ?? "#1e794e" : "#1e794e"} />
              <div style={{ flex: 1 }}>
                <strong style={{ fontSize: 14 }}>{today.name}</strong>
                <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>
                  {today.time}{today.coach && ` · ${today.coach}`}
                </div>
              </div>
            </div>
          ) : (
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 8 }}>오늘 수업이 없습니다.</p>
          )}
          {studentName && (
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, textAlign: "right" }}>{studentName}</div>
          )}
        </section>

        {/* 빠른 메뉴 */}
        <section className="quick-grid">
          <a href="/student/schedule" className="quick-item"><Calendar size={22} /><span>시간표</span></a>
          <a href="/student/shuttle" className="quick-item"><QrCode size={22} /><span>셔틀 QR</span></a>
          <a href="/student/reports" className="quick-item"><FileText size={22} /><span>내 리포트</span></a>
        </section>

        {/* 알림 */}
        <section className="card">
          <div className="card-head">
            <strong>알림</strong>
            <a href="/student/notices" className="card-more">전체 보기 <ChevronRight size={14} /></a>
          </div>
          {notices.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>새 알림이 없습니다.</p>
          ) : (
            notices.map((n) => (
              <a key={n.id} href={`/student/notices/${n.id}`} className="notice-row">
                <div style={{ flex: 1 }}>
                  <div className="notice-title">{n.title}</div>
                  <div className="notice-time">{n.time}</div>
                </div>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))
          )}
        </section>
      </div>
      <StudentTabbar />
    </>
  );
}
