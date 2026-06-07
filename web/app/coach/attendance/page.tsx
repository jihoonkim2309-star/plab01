import { ArrowLeft, Bell } from "lucide-react";
import CoachTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import AttendanceMobile from "./AttendanceMobile";
import NoteEditor from "@/app/admin/class-notes/NoteEditor";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayYmd(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(ymd: string): string {
  return DAYS[new Date(ymd + "T00:00:00").getDay()];
}

export default async function CoachAttendance({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; class_id?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date || todayYmd();
  const guard = await requirePortal("coach");
  if (guard.isEmbed) {
    return (
      <>
        <div className="portal-topbar">
          <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
            <ArrowLeft size={18} /> 뒤로
          </a>
          <h1 style={{ flex: 1, textAlign: "center" }}>출석체크</h1>
          <Bell size={20} />
        </div>
        <div className="portal-content">
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>로그인 후 이용해 주세요.</p>
          </section>
        </div>
        <CoachTabbar />
      </>
    );
  }
  const { supabase, userId, centerId } = guard;

  const { data: user } = await supabase.from("users").select("name").eq("id", userId).single();
  const coachName = (user as { name?: string } | null)?.name ?? null;

  let cQuery = supabase
    .from("classes")
    .select("id, name, days_of_week, start_time, end_time, coach, coach_id")
    .eq("center_id", centerId!)
    .eq("status", "운영");
  if (coachName) cQuery = cQuery.or(`coach_id.eq.${userId},coach.eq.${coachName}`);
  else cQuery = cQuery.eq("coach_id", userId);

  const { data: clsRows } = await cQuery.order("start_time", { nullsFirst: true });
  type C = { id: string; name: string; days_of_week: string | null; start_time: string | null; end_time: string | null };
  const allMy = (clsRows ?? []) as C[];
  const dl = dayLabel(date);
  const todayClasses = allMy.filter((c) => (c.days_of_week ?? "").split(/[,\s]+/).includes(dl));
  const visibleClasses = todayClasses.length > 0 ? todayClasses : allMy;

  const classId = sp.class_id || visibleClasses[0]?.id || "";
  const selected = allMy.find((c) => c.id === classId) ?? null;

  let students: { id: string; name: string }[] = [];
  let attendance: { student_id: string; status: string }[] = [];

  let existingNote: { content: string; public_to_parent: boolean } | null = null;
  if (selected) {
    const { data: stRows } = await supabase
      .from("students")
      .select("id, name")
      .eq("center_id", centerId!)
      .eq("class_id", selected.id)
      .in("status", ["정상", "상담중", "휴원"])
      .order("name");
    students = (stRows ?? []) as { id: string; name: string }[];
    if (students.length > 0) {
      const { data: attRows } = await supabase
        .from("attendance")
        .select("student_id, status")
        .eq("class_id", selected.id)
        .eq("attendance_date", date);
      attendance = (attRows ?? []) as { student_id: string; status: string }[];
    }
    const { data: noteRow } = await supabase
      .from("class_notes")
      .select("content, public_to_parent")
      .eq("class_id", selected.id)
      .eq("note_date", date)
      .maybeSingle();
    existingNote = noteRow as { content: string; public_to_parent: boolean } | null;
  }

  // 날짜 nav
  const shiftDate = (delta: number): string => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + delta);
    return d.toISOString().slice(0, 10);
  };

  return (
    <>
      <div className="portal-topbar">
        <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>출석체크</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {/* 날짜 nav */}
        <section className="card" style={{ display: "flex", alignItems: "center", gap: 6, padding: "10px 12px" }}>
          <a href={`/coach/attendance?date=${shiftDate(-1)}&class_id=${classId}`} className="btn" style={{ padding: "4px 10px", fontSize: 12 }}>← 어제</a>
          <strong style={{ flex: 1, textAlign: "center", fontSize: 13 }}>{date} ({dl})</strong>
          <a href={`/coach/attendance?date=${shiftDate(1)}&class_id=${classId}`} className="btn" style={{ padding: "4px 10px", fontSize: 12 }}>내일 →</a>
        </section>

        {/* 클래스 선택 */}
        <section className="card">
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {visibleClasses.map((c) => {
              const on = c.id === classId;
              return (
                <a
                  key={c.id}
                  href={`/coach/attendance?date=${date}&class_id=${c.id}`}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: on ? "2px solid var(--brand)" : "1px solid #e5e7eb",
                    background: on ? "var(--brand-soft)" : "#fff",
                    color: on ? "var(--brand)" : "#374151",
                    fontWeight: on ? 800 : 600,
                    fontSize: 12,
                    textDecoration: "none",
                  }}
                >
                  {c.name}
                  {c.start_time && (
                    <span style={{ marginLeft: 6, fontSize: 11, color: "#9ca3af" }}>
                      {c.start_time.slice(0, 5)}
                    </span>
                  )}
                </a>
              );
            })}
            {visibleClasses.length === 0 && (
              <span style={{ fontSize: 12, color: "#9ca3af" }}>담당 클래스가 없습니다.</span>
            )}
          </div>
        </section>

        {selected && (
          <AttendanceMobile
            students={students}
            attendance={attendance}
            classId={selected.id}
            date={date}
          />
        )}

        {selected && (
          <section className="card">
            <div className="card-head">
              <strong>수업일지</strong>
            </div>
            <NoteEditor
              classId={selected.id}
              noteDate={date}
              initialContent={existingNote?.content ?? ""}
              initialPublic={existingNote?.public_to_parent ?? true}
            />
          </section>
        )}
      </div>
      <CoachTabbar />
    </>
  );
}
