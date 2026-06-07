import { ArrowLeft, Bell, Clock } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

const DAYS = ["월", "화", "수", "목", "금", "토", "일"];

type SchedItem = {
  studentName: string | null;
  className: string;
  time: string;
  coach: string;
  color: string | null;
  isMine: boolean;
};
type DayBucket = { day: string; items: SchedItem[] };
type Tab = "mine" | "center";

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

function timeRange(start: string | null, end: string | null): string {
  const f = (t: string | null) => (t ? t.slice(0, 5) : "");
  if (!start && !end) return "";
  return `${f(start)} - ${f(end)}`;
}

const MOCK_WEEK: DayBucket[] = [
  { day: "월", items: [{ studentName: "박도윤", className: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green", isMine: true }] },
  { day: "화", items: [] },
  { day: "수", items: [{ studentName: "박도윤", className: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green", isMine: true }] },
  { day: "목", items: [] },
  { day: "금", items: [{ studentName: "박도윤", className: "정규반 A", time: "16:00 - 17:00", coach: "박코치", color: "green", isMine: true }] },
  { day: "토", items: [] },
  { day: "일", items: [] },
];

type ClassRow = {
  id: string;
  name: string;
  days_of_week: string | null;
  start_time: string | null;
  end_time: string | null;
  coach: string | null;
  color: string | null;
};

async function fetchWeek(tab: Tab): Promise<DayBucket[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK_WEEK;
  const { supabase, userId, centerId } = guard;

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
  const myClassIds = new Set(studentList.map((s) => s.classId));

  let classes: ClassRow[] = [];
  if (tab === "center" && centerId) {
    const { data } = await supabase
      .from("classes")
      .select("id, name, days_of_week, start_time, end_time, coach, color, status")
      .eq("center_id", centerId)
      .eq("status", "운영")
      .order("start_time", { nullsFirst: true });
    classes = (data ?? []) as ClassRow[];
  } else if (myClassIds.size > 0) {
    const { data } = await supabase
      .from("classes")
      .select("id, name, days_of_week, start_time, end_time, coach, color")
      .in("id", Array.from(myClassIds));
    classes = (data ?? []) as ClassRow[];
  }

  const buckets: DayBucket[] = DAYS.map((d) => ({ day: d, items: [] }));
  for (const c of classes) {
    const isMine = myClassIds.has(c.id);
    const dows = (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean);
    const tr = timeRange(c.start_time, c.end_time);
    const studentName = isMine ? studentList.find((s) => s.classId === c.id)?.name ?? null : null;
    for (const dow of dows) {
      const idx = DAYS.indexOf(dow);
      if (idx < 0) continue;
      buckets[idx].items.push({
        studentName,
        className: c.name,
        time: tr,
        coach: c.coach ?? "",
        color: c.color,
        isMine,
      });
    }
  }
  for (const b of buckets) {
    b.items.sort((a, b) => a.time.localeCompare(b.time));
  }
  return buckets;
}

export default async function ParentSchedule({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "center" ? "center" : "mine";
  const week = await fetchWeek(tab);
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          {([
            { v: "mine" as Tab, label: "내 자녀" },
            { v: "center" as Tab, label: "학원 전체" },
          ]).map((t) => {
            const on = t.v === tab;
            return (
              <a
                key={t.v}
                href={`/parent/schedule?tab=${t.v}`}
                style={{
                  padding: "10px 0",
                  borderRadius: 10,
                  textAlign: "center",
                  textDecoration: "none",
                  border: on ? "2px solid var(--brand, #1e794e)" : "1px solid #e5e7eb",
                  background: on ? "var(--brand-soft, #d8ecdf)" : "#fff",
                  color: on ? "var(--brand, #1e794e)" : "#374151",
                  fontWeight: on ? 800 : 600,
                  fontSize: 13,
                }}
              >
                {t.label}
              </a>
            );
          })}
        </div>

        {!hasAny && (
          <section className="card">
            <div style={{ textAlign: "center", padding: "24px 0", color: "#6f7d78", fontSize: 13 }}>
              {tab === "mine" ? "아직 자녀에게 배정된 수업이 없습니다." : "운영 중인 클래스가 없습니다."}
            </div>
          </section>
        )}
        {hasAny &&
          week.map((w) => (
            <section key={w.day} className="card" style={{ padding: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    background: w.items.length ? "var(--brand)" : "#f1f5f4",
                    color: w.items.length ? "#fff" : "#9ca3af",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    flexShrink: 0,
                  }}
                >
                  {w.day}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  {w.items.length === 0 ? (
                    <div style={{ fontSize: 12, color: "#9ca3af" }}>수업 없음</div>
                  ) : (
                    w.items.map((it, i) => {
                      const dot = it.color ? COLOR_MAP[it.color] ?? "#1e794e" : "#1e794e";
                      return (
                        <div
                          key={i}
                          style={{
                            marginTop: i > 0 ? 8 : 0,
                            opacity: tab === "center" && !it.isMine ? 0.7 : 1,
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            <span style={{ width: 8, height: 8, borderRadius: "50%", background: dot, display: "inline-block", flexShrink: 0 }} />
                            <strong style={{ fontSize: 13 }}>{it.className}</strong>
                            {it.studentName && (
                              <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, background: "var(--brand-soft, #d8ecdf)", padding: "1px 6px", borderRadius: 4 }}>
                                {it.studentName}
                              </span>
                            )}
                          </div>
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
