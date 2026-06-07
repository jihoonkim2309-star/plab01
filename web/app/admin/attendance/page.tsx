import Link from "next/link";
import { requireCenter } from "@/lib/center";
import AttendanceGrid from "./AttendanceGrid";
import DateNav from "./DateNav";
import NoteEditor from "../class-notes/NoteEditor";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

function todayYmd(): string {
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function dayLabelForDate(ymd: string): string {
  const d = new Date(ymd + "T00:00:00");
  return DAYS[d.getDay()];
}

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; class_id?: string }>;
}) {
  const sp = await searchParams;
  const date = sp.date || todayYmd();
  const { supabase, centerId } = await requireCenter();

  const { data: clsRows } = await supabase
    .from("classes")
    .select("id, name, days_of_week, start_time, end_time, coach, color, status")
    .eq("center_id", centerId)
    .eq("status", "운영")
    .order("start_time", { nullsFirst: true });
  type C = { id: string; name: string; days_of_week: string | null; start_time: string | null; end_time: string | null; coach: string | null; color: string | null };
  const classes = (clsRows ?? []) as C[];

  // 그 날 요일에 운영하는 클래스만 default 추천 — 사용자가 다른 클래스 선택 가능
  const dayLabel = dayLabelForDate(date);
  const todaysClasses = classes.filter((c) =>
    (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean).includes(dayLabel),
  );
  const visibleClasses = todaysClasses.length > 0 ? todaysClasses : classes;

  const classId = sp.class_id || visibleClasses[0]?.id || "";
  const selectedClass = classes.find((c) => c.id === classId) ?? null;

  let students: { id: string; name: string }[] = [];
  let attendance: { student_id: string; status: string; note: string | null; marked_at: string | null }[] = [];

  if (selectedClass) {
    const { data: stRows } = await supabase
      .from("students")
      .select("id, name")
      .eq("center_id", centerId)
      .eq("class_id", selectedClass.id)
      .in("status", ["정상", "상담중", "휴원"])
      .order("name");
    students = (stRows ?? []) as { id: string; name: string }[];

    if (students.length > 0) {
      const { data: attRows } = await supabase
        .from("attendance")
        .select("student_id, status, note, marked_at")
        .eq("center_id", centerId)
        .eq("class_id", selectedClass.id)
        .eq("attendance_date", date)
        .in("student_id", students.map((s) => s.id));
      attendance = (attRows ?? []) as { student_id: string; status: string; note: string | null; marked_at: string | null }[];
    }
  }

  // 요약
  const totals = {
    total: students.length,
    출석: attendance.filter((a) => a.status === "출석").length,
    지각: attendance.filter((a) => a.status === "지각").length,
    결석: attendance.filter((a) => a.status === "결석").length,
    보강: attendance.filter((a) => a.status === "보강").length,
    안찍힘: students.length - attendance.length,
  };

  // 수업일지 (선택된 클래스 + 날짜)
  let existingNote: { content: string; public_to_parent: boolean } | null = null;
  if (selectedClass) {
    const { data: noteRow } = await supabase
      .from("class_notes")
      .select("content, public_to_parent")
      .eq("class_id", selectedClass.id)
      .eq("note_date", date)
      .maybeSingle();
    existingNote = noteRow as { content: string; public_to_parent: boolean } | null;
  }

  // 날짜 nav
  const prevDate = ((): string => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  const nextDate = ((): string => {
    const d = new Date(date + "T00:00:00");
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  })();

  return (
    <>
      <div className="page-head">
        <div>
          <h1>출석 관리</h1>
          <p className="subtext">날짜·클래스 선택 후 학생별 상태 토글</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>출석</span><strong>{totals.출석}</strong></div>
        <div className="summary-card"><span>지각</span><strong>{totals.지각}</strong></div>
        <div className="summary-card"><span>결석</span><strong>{totals.결석}</strong></div>
        <div className="summary-card"><span>안찍힘</span><strong>{totals.안찍힘}</strong></div>
      </div>

      <div className="panel elevated">
        <div className="panel-head" style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* 날짜 nav */}
          <Link className="btn" href={`/admin/attendance?date=${prevDate}&class_id=${classId}`}>← 어제</Link>
          <DateNav date={date} classId={classId} />
          <Link className="btn" href={`/admin/attendance?date=${nextDate}&class_id=${classId}`}>내일 →</Link>
          <Link className="btn" href={`/admin/attendance?date=${todayYmd()}&class_id=${classId}`}>오늘</Link>
          <span style={{ fontSize: 12, color: "var(--muted)", marginLeft: 6 }}>({dayLabel}요일)</span>
        </div>

        <div className="panel-body" style={{ paddingTop: 0 }}>
          {/* 클래스 칩 */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4, marginBottom: 12 }}>
            {visibleClasses.map((c) => {
              const on = c.id === classId;
              return (
                <Link
                  key={c.id}
                  href={`/admin/attendance?date=${date}&class_id=${c.id}`}
                  className="btn"
                  style={{
                    padding: "6px 12px",
                    border: on ? "2px solid var(--brand)" : "1px solid var(--line)",
                    background: on ? "var(--brand-soft)" : "#fff",
                    color: on ? "var(--brand)" : "var(--text)",
                    fontWeight: on ? 800 : 600,
                    fontSize: 12,
                  }}
                >
                  {c.name}
                  {c.start_time && (
                    <span className="muted" style={{ marginLeft: 6, fontSize: 11 }}>
                      {c.start_time.slice(0, 5)}
                    </span>
                  )}
                </Link>
              );
            })}
            {visibleClasses.length === 0 && (
              <span className="muted" style={{ fontSize: 12 }}>
                이 날 운영하는 클래스가 없습니다.
              </span>
            )}
          </div>

          {selectedClass && (
            <AttendanceGrid
              students={students}
              attendance={attendance}
              classId={selectedClass.id}
              date={date}
            />
          )}
        </div>
      </div>

      {selectedClass && (
        <div className="panel elevated" style={{ marginTop: 14 }}>
          <div className="panel-head">
            <p className="panel-title">
              수업일지 — {selectedClass.name} · {date}
            </p>
          </div>
          <div className="panel-body">
            <NoteEditor
              classId={selectedClass.id}
              noteDate={date}
              initialContent={existingNote?.content ?? ""}
              initialPublic={existingNote?.public_to_parent ?? true}
            />
          </div>
        </div>
      )}
    </>
  );
}
