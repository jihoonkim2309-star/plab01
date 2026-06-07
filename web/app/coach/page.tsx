import { Bell, ChevronRight, Clock, Users } from "lucide-react";
import CoachTabbar from "./Tabbar";
import { requirePortal } from "@/lib/portal-auth";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type TodayClass = { id: string; name: string; time: string; count: number; color: string | null };

const MOCK_CLASSES: TodayClass[] = [
  { id: "c1", name: "정규반 A", time: "16:00 - 17:00", count: 12, color: "green" },
];

async function fetchHome(): Promise<{ today: TodayClass[]; coachName: string | null }> {
  const guard = await requirePortal("coach");
  if (guard.isEmbed) return { today: MOCK_CLASSES, coachName: "박코치" };
  const { supabase, userId, centerId } = guard;

  const { data: user } = await supabase.from("users").select("name").eq("id", userId).single();
  const coachName = (user as { name?: string } | null)?.name ?? null;

  if (!centerId) return { today: [], coachName };
  const todayLabel = DAYS[new Date().getDay()];

  // 코치 본인 담당 = coach_id 매칭 또는 coach 이름 매칭 (legacy 데이터)
  let query = supabase
    .from("classes")
    .select("id, name, days_of_week, start_time, end_time, coach, coach_id, color")
    .eq("center_id", centerId)
    .eq("status", "운영");
  if (coachName) {
    query = query.or(`coach_id.eq.${userId},coach.eq.${coachName}`);
  } else {
    query = query.eq("coach_id", userId);
  }
  const { data: cls } = await query.order("start_time", { nullsFirst: true });
  type CR = { id: string; name: string; days_of_week: string | null; start_time: string | null; end_time: string | null; coach: string | null; coach_id: string | null; color: string | null };
  const classes = ((cls ?? []) as CR[]).filter((c) =>
    (c.days_of_week ?? "").split(/[,\s]+/).includes(todayLabel),
  );

  if (classes.length === 0) return { today: [], coachName };

  const { data: counts } = await supabase
    .from("students")
    .select("class_id")
    .in("class_id", classes.map((c) => c.id))
    .eq("status", "정상");
  const countMap = new Map<string, number>();
  for (const r of ((counts ?? []) as { class_id: string }[])) {
    countMap.set(r.class_id, (countMap.get(r.class_id) ?? 0) + 1);
  }

  const f = (t: string | null) => (t ? t.slice(0, 5) : "");
  const today: TodayClass[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    time: c.start_time && c.end_time ? `${f(c.start_time)} - ${f(c.end_time)}` : "",
    count: countMap.get(c.id) ?? 0,
    color: c.color,
  }));

  return { today, coachName };
}

const COLOR_MAP: Record<string, string> = {
  green: "#1e794e",
  blue: "#2563eb",
  orange: "#d97706",
  purple: "#7c3aed",
  pink: "#db2777",
  amber: "#b45309",
};

export default async function CoachHome() {
  const { today, coachName } = await fetchHome();
  return (
    <>
      <div className="portal-topbar">
        <h1>{coachName ? `${coachName} 코치` : "플랜비 코치"}</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <div className="card-head">
            <strong>오늘의 수업</strong>
            <a href="/coach/attendance" className="card-more">출석체크 <ChevronRight size={14} /></a>
          </div>
          {today.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>오늘 담당 수업이 없습니다.</p>
          ) : (
            today.map((c) => {
              const dot = c.color ? COLOR_MAP[c.color] ?? "#1e794e" : "#1e794e";
              return (
                <a key={c.id} href={`/coach/attendance?class_id=${c.id}`} className="child-row" style={{ textDecoration: "none", color: "#111" }}>
                  <div className="avatar" style={{ background: "var(--brand-soft, #d8ecdf)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: dot, display: "inline-block" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <strong style={{ fontSize: 14 }}>{c.name}</strong>
                    <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <Clock size={12} /> {c.time}
                      <Users size={12} style={{ marginLeft: 6 }} /> {c.count}명
                    </div>
                  </div>
                  <ChevronRight size={16} color="#9ca3af" />
                </a>
              );
            })
          )}
        </section>
      </div>
      <CoachTabbar />
    </>
  );
}
