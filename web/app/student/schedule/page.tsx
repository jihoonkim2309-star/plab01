import { ArrowLeft, Bell } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import CalendarView from "../../portal/CalendarView";
import { buildEvents, monthGridRange, type ClassDef, type Holiday, type Makeup, type AttendanceRow } from "@/lib/calendar";

type Tab = "mine" | "center";

async function fetchData(tab: Tab) {
  const guard = await requirePortal("student");
  if (guard.isEmbed) {
    const now = new Date();
    const { from, to } = monthGridRange(now.getFullYear(), now.getMonth());
    return { events: [], from, to };
  }
  const { supabase, userId, centerId } = guard;

  const { data: link } = await supabase
    .from("student_account_links")
    .select("students(id, class_id)")
    .eq("user_id", userId)
    .eq("status", "linked")
    .limit(1)
    .maybeSingle();
  type LR = { students: { id: string; class_id: string | null } | null };
  const linkRow = link as unknown as LR | null;
  const myClassId = linkRow?.students?.class_id ?? null;
  const myStudentId = linkRow?.students?.id ?? null;

  type ClassRow = { id: string; name: string; days_of_week: string | null; start_time: string | null; end_time: string | null; coach: string | null; color: string | null };
  let classes: ClassRow[] = [];
  if (tab === "center" && centerId) {
    const { data } = await supabase
      .from("classes")
      .select("id, name, days_of_week, start_time, end_time, coach, color")
      .eq("center_id", centerId)
      .eq("status", "운영");
    classes = (data ?? []) as ClassRow[];
  } else if (myClassId) {
    const { data } = await supabase
      .from("classes")
      .select("id, name, days_of_week, start_time, end_time, coach, color")
      .eq("id", myClassId);
    classes = (data ?? []) as ClassRow[];
  }

  const classDefs: ClassDef[] = classes.map((c) => ({
    id: c.id,
    name: c.name,
    days_of_week: c.days_of_week,
    start_time: c.start_time,
    end_time: c.end_time,
    coach: c.coach,
    color: c.color,
    isMine: c.id === myClassId,
    studentId: c.id === myClassId ? myStudentId : null,
  }));

  const now = new Date();
  const { from, to } = monthGridRange(now.getFullYear(), now.getMonth());
  const fromYmd = from.toISOString().slice(0, 10);
  const toYmd = to.toISOString().slice(0, 10);

  const classIds = classDefs.map((c) => c.id);
  let holidays: Holiday[] = [];
  let makeups: Makeup[] = [];
  let attendance: AttendanceRow[] = [];
  if (classIds.length > 0 && centerId) {
    const [holidaysRes, makeupsRes, attRes] = await Promise.all([
      supabase
        .from("holidays")
        .select("holiday_date, class_id, reason")
        .eq("center_id", centerId)
        .gte("holiday_date", fromYmd)
        .lte("holiday_date", toYmd),
      supabase
        .from("makeups")
        .select("class_id, original_date, makeup_date, reason, status")
        .eq("center_id", centerId)
        .in("class_id", classIds)
        .gte("makeup_date", fromYmd)
        .lte("makeup_date", toYmd),
      myStudentId
        ? supabase
            .from("attendance")
            .select("class_id, student_id, attendance_date, status")
            .eq("student_id", myStudentId)
            .gte("attendance_date", fromYmd)
            .lte("attendance_date", toYmd)
        : Promise.resolve({ data: [] as AttendanceRow[] }),
    ]);
    holidays = (holidaysRes.data ?? []) as Holiday[];
    makeups = (makeupsRes.data ?? []) as Makeup[];
    attendance = (attRes.data ?? []) as AttendanceRow[];
  }

  const events = buildEvents({ classes: classDefs, holidays, makeups, attendance, from, to });
  return { events, from, to };
}

export default async function StudentSchedule({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: tabParam } = await searchParams;
  const tab: Tab = tabParam === "center" ? "center" : "mine";
  const { events } = await fetchData(tab);
  const now = new Date();
  const dow = now.getDay();
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const weekFrom = new Date(now);
  weekFrom.setDate(now.getDate() + monOffset);

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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
          {([{ v: "mine" as Tab, label: "내 수업" }, { v: "center" as Tab, label: "학원 전체" }]).map((t) => {
            const on = t.v === tab;
            return (
              <a
                key={t.v}
                href={`/student/schedule?tab=${t.v}`}
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
        <CalendarView
          events={events}
          initialYear={now.getFullYear()}
          initialMonth0={now.getMonth()}
          initialWeekFrom={weekFrom.toISOString().slice(0, 10)}
          selfLabel="내 수업"
        />
      </div>
      <StudentTabbar />
    </>
  );
}
