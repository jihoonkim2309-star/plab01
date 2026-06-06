import { ArrowLeft, Bell, Clock } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

type SchedItem = { className: string; time: string; coach: string; color: string | null };
type DayBucket = { day: string; items: SchedItem[] };

const MOCK_WEEK: DayBucket[] = [
  { day: "월", items: [{ className: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green" }] },
  { day: "화", items: [] },
  { day: "수", items: [{ className: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green" }] },
  { day: "목", items: [] },
  { day: "금", items: [{ className: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green" }] },
  { day: "토", items: [] },
  { day: "일", items: [] },
];

const COLOR_MAP: Record<string, string> = {
  green: "#1e794e",
  blue: "#2563eb",
  orange: "#d97706",
  purple: "#7c3aed",
  pink: "#db2777",
  amber: "#b45309",
};

function timeRange(start: string | null, end: string | null): string {
  const f = (t: string | null) => (t ? t.slice(0, 5) : "");
  if (!start && !end) return "";
  return `${f(start)} - ${f(end)}`;
}

async function fetchWeek(): Promise<DayBucket[]> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return MOCK_WEEK;
  const { supabase, userId } = guard;

  const { data: link } = await supabase
    .from("student_account_links")
    .select("students(id, class_id)")
    .eq("user_id", userId)
    .eq("status", "linked")
    .limit(1)
    .maybeSingle();
  type LR = { students: { id: string; class_id: string | null } | null };
  const linkRow = link as unknown as LR | null;
  const student = linkRow?.students;
  const buckets: DayBucket[] = DAYS.map((d) => ({ day: d, items: [] }));
  if (!student?.class_id) return buckets;

  const { data: cls } = await supabase
    .from("classes")
    .select("name, days_of_week, start_time, end_time, coach, color")
    .eq("id", student.class_id)
    .maybeSingle();
  type CR = { name: string; days_of_week: string | null; start_time: string | null; end_time: string | null; coach: string | null; color: string | null };
  const c = cls as CR | null;
  if (!c) return buckets;

  const dows = (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean);
  const tr = timeRange(c.start_time, c.end_time);
  for (const dow of dows) {
    const idx = DAYS.indexOf(dow);
    if (idx < 0) continue;
    buckets[idx].items.push({
      className: c.name,
      time: tr,
      coach: c.coach ?? "",
      color: c.color,
    });
  }
  return buckets;
}

export default async function StudentSchedule() {
  const week = await fetchWeek();
  const hasAny = week.some((w) => w.items.length > 0);
  return (
    <>
      <div className="portal-topbar">
        <a href="/student" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>시간표</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>이번 주 수업</p>
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
                        <div key={i} style={{ marginTop: i > 0 ? 8 : 0 }}>
                          <strong style={{ fontSize: 13, display: "inline-flex", alignItems: "center", gap: 6 }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, display: "inline-block" }} />
                            {it.className}
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
      <StudentTabbar />
    </>
  );
}
