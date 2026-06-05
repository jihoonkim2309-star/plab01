import { ArrowLeft, Bell, Clock } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

type SchedItem = {
  studentName: string;
  className: string;
  time: string;
  coach: string;
  color: string | null;
};
type DayBucket = { day: string; items: SchedItem[] };

const MOCK_WEEK: DayBucket[] = [
  { day: "월", items: [{ studentName: "박도윤", time: "16:00 - 17:00", className: "정규반 A", coach: "박코치", color: "green" }] },
  { day: "화", items: [] },
  { day: "수", items: [{ studentName: "박도윤", time: "16:00 - 17:00", className: "정규반 A", coach: "박코치", color: "green" }] },
  { day: "목", items: [] },
  { day: "금", items: [{ studentName: "박도윤", time: "16:00 - 17:00", className: "정규반 A", coach: "박코치", color: "green" }] },
  { day: "토", items: [] },
  { day: "일", items: [] },
];

function timeRange(start: string | null, end: string | null): string {
  const f = (t: string | null) => (t ? t.slice(0, 5) : "");
  if (!start && !end) return "";
  return `${f(start)} - ${f(end)}`;
}

async function fetchWeek(): Promise<DayBucket[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK_WEEK;
  const { supabase, userId } = guard;

  // 자녀 linked student_id 목록
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id, students(id, name, class_id)")
    .eq("parent_id", userId)
    .eq("status", "linked")
    .not("student_id", "is", null);
  type LR = { student_id: string; students: { id: string; name: string; class_id: string | null } | null };
  const studentList = ((links ?? []) as unknown as LR[])
    .filter((r) => !!r.students && !!r.students.class_id)
    .map((r) => ({ studentId: r.students!.id, name: r.students!.name, classId: r.students!.class_id! }));

  if (studentList.length === 0) {
    return DAYS.map((d) => ({ day: d, items: [] }));
  }

  const classIds = Array.from(new Set(studentList.map((s) => s.classId)));
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, days_of_week, start_time, end_time, coach, color")
    .in("id", classIds);
  type CR = {
    id: string;
    name: string;
    days_of_week: string | null;
    start_time: string | null;
    end_time: string | null;
    coach: string | null;
    color: string | null;
  };
  const classMap = new Map<string, CR>(
    ((classes ?? []) as CR[]).map((c) => [c.id, c]),
  );

  const buckets: DayBucket[] = DAYS.map((d) => ({ day: d, items: [] }));
  for (const s of studentList) {
    const c = classMap.get(s.classId);
    if (!c) continue;
    const dows = (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean);
    const tr = timeRange(c.start_time, c.end_time);
    for (const dow of dows) {
      const idx = DAYS.indexOf(dow);
      if (idx < 0) continue;
      buckets[idx].items.push({
        studentName: s.name,
        className: c.name,
        time: tr,
        coach: c.coach ?? "",
        color: c.color,
      });
    }
  }
  return buckets;
}

const COLOR_MAP: Record<string, string> = {
  green: "#1e794e",
  blue: "#2563eb",
  orange: "#d97706",
  purple: "#7c3aed",
  pink: "#db2777",
  amber: "#b45309",
  teal: "#0d9488",
  cyan: "#0891b2",
  indigo: "#4338ca",
  lime: "#65a30d",
  rose: "#e11d48",
  slate: "#475569",
};

export default async function ParentSchedule() {
  const week = await fetchWeek();
  const hasAny = week.some((w) => w.items.length > 0);
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>시간표</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>이번 주 자녀 수업</p>
        {!hasAny && (
          <section className="card">
            <div style={{ textAlign: "center", padding: "24px 0", color: "#6f7d78", fontSize: 13 }}>
              아직 배정된 수업이 없습니다.
            </div>
          </section>
        )}
        {hasAny &&
          week.map((w) => (
            <section key={w.day} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: w.items.length ? "var(--brand)" : "#f1f5f4", color: w.items.length ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
                  {w.day}
                </div>
                <div style={{ flex: 1 }}>
                  {w.items.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>수업 없음</div>
                  ) : (
                    w.items.map((it, i) => {
                      const dot = it.color ? COLOR_MAP[it.color] ?? "#1e794e" : "#1e794e";
                      return (
                        <div key={i} style={{ display: "flex", flexDirection: "column", marginTop: i > 0 ? 8 : 0 }}>
                          <strong style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, display: "inline-block" }} />
                            {it.className}
                            <span style={{ fontSize: 11, color: "#6f7d78", fontWeight: 400 }}>· {it.studentName}</span>
                          </strong>
                          <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Clock size={12} /> {it.time}{it.coach && ` · ${it.coach}`}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>
          ))}
      </div>
      <PortalTabbar />
    </>
  );
}
