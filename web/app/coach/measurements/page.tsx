import { ArrowLeft, Bell, ChevronRight, Ruler } from "lucide-react";
import CoachTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

type StudentRow = { id: string; name: string; grade: string | null; lastMeasured: string | null };

async function fetchStudents(): Promise<StudentRow[]> {
  const guard = await requirePortal("coach");
  if (guard.isEmbed) {
    return [
      { id: "s1", name: "박도윤", grade: "초3", lastMeasured: "2026-05-20" },
      { id: "s2", name: "강시우", grade: "초6", lastMeasured: "2026-05-22" },
    ];
  }
  const { supabase, userId, centerId } = guard;

  const { data: user } = await supabase.from("users").select("name").eq("id", userId).single();
  const coachName = (user as { name?: string } | null)?.name ?? null;

  if (!centerId) return [];
  let cq = supabase
    .from("classes")
    .select("id, coach, coach_id")
    .eq("center_id", centerId)
    .eq("status", "운영");
  if (coachName) cq = cq.or(`coach_id.eq.${userId},coach.eq.${coachName}`);
  else cq = cq.eq("coach_id", userId);
  const { data: clsRows } = await cq;
  type CR = { id: string };
  const myClassIds = ((clsRows ?? []) as CR[]).map((c) => c.id);
  if (myClassIds.length === 0) return [];

  const { data: stRows } = await supabase
    .from("students")
    .select("id, name, grade")
    .eq("center_id", centerId)
    .in("class_id", myClassIds)
    .in("status", ["정상", "상담중", "휴원"])
    .order("name");
  type SR = { id: string; name: string; grade: string | null };
  const students = (stRows ?? []) as SR[];
  if (students.length === 0) return [];

  // 최근 측정일 — measurements 에 student별 최근 한 건
  const { data: mRows } = await supabase
    .from("measurements")
    .select("student_id, measured_at")
    .in("student_id", students.map((s) => s.id))
    .order("measured_at", { ascending: false });
  type MR = { student_id: string; measured_at: string | null };
  const lastMap = new Map<string, string>();
  for (const m of (mRows ?? []) as MR[]) {
    if (m.measured_at && !lastMap.has(m.student_id)) lastMap.set(m.student_id, m.measured_at);
  }

  return students.map((s) => ({
    id: s.id,
    name: s.name,
    grade: s.grade,
    lastMeasured: lastMap.get(s.id)?.slice(0, 10) ?? null,
  }));
}

export default async function CoachMeasurements() {
  const students = await fetchStudents();
  return (
    <>
      <div className="portal-topbar">
        <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>측정 입력</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>학생을 선택하면 측정값을 입력할 수 있습니다.</p>
        {students.length === 0 ? (
          <section className="card" style={{ padding: 28, textAlign: "center" }}>
            <Ruler size={28} color="#9ca3af" style={{ marginBottom: 8 }} />
            <strong style={{ display: "block", fontSize: 14 }}>담당 학생이 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6 }}>
              담당 클래스가 배정되면 표시됩니다.
            </p>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {students.map((s) => (
              <a key={s.id} href={`/coach/measurements/${s.id}`} className="list-row" style={{ padding: "14px 16px" }}>
                <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{s.name.slice(0, 1)}</div>
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">
                    {s.name}{" "}
                    {s.grade && <span style={{ fontWeight: 500, color: "#6f7d78", fontSize: 11 }}>{s.grade}</span>}
                  </div>
                  <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Ruler size={11} /> 마지막 측정: {s.lastMeasured ?? "기록 없음"}
                  </div>
                </div>
                <ChevronRight size={16} color="#9ca3af" />
              </a>
            ))}
          </section>
        )}
      </div>
      <CoachTabbar />
    </>
  );
}
