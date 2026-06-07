// 시간표 캘린더 — 주간 반복 패턴 (classes.days_of_week + start/end_time) 을
// 특정 날짜 범위에 펼친 후 holidays (해당 날짜 휴강 제외) + makeups (보강 추가) 반영.

export type ClassDef = {
  id: string;
  name: string;
  days_of_week: string | null; // "월,수,금"
  start_time: string | null;   // "HH:MM:SS"
  end_time: string | null;
  coach: string | null;
  color: string | null;
  isMine: boolean;
  studentName?: string | null;
};

export type Holiday = {
  holiday_date: string; // YYYY-MM-DD
  class_id: string | null; // null = 전체 휴강
  reason: string | null;
};

export type Makeup = {
  class_id: string;
  original_date: string | null;
  makeup_date: string | null;
  reason: string | null;
  status: string;
};

export type EventItem = {
  date: string; // YYYY-MM-DD
  type: "class" | "holiday" | "makeup";
  className: string;
  classId: string;
  time: string; // "HH:MM - HH:MM" (휴강이면 빈 문자열 가능)
  coach: string;
  color: string | null;
  isMine: boolean;
  studentName?: string | null;
  note?: string | null; // 휴강 사유 / 보강 사유
};

const DAY_LABELS = ["일", "월", "화", "수", "목", "금", "토"];

function ymd(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function fmtTimeRange(start: string | null, end: string | null): string {
  const f = (t: string | null) => (t ? t.slice(0, 5) : "");
  if (!start && !end) return "";
  return `${f(start)} - ${f(end)}`;
}

// 두 날짜 사이 (둘 다 포함) 이벤트 생성.
export function buildEvents(args: {
  classes: ClassDef[];
  holidays: Holiday[];
  makeups: Makeup[];
  from: Date;
  to: Date;
}): EventItem[] {
  const { classes, holidays, makeups, from, to } = args;

  const classMap = new Map(classes.map((c) => [c.id, c]));
  const holidayByDate = new Map<string, Holiday[]>();
  for (const h of holidays) {
    const list = holidayByDate.get(h.holiday_date) ?? [];
    list.push(h);
    holidayByDate.set(h.holiday_date, list);
  }

  const events: EventItem[] = [];

  // 주간 반복 펼침
  const cur = new Date(from);
  cur.setHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setHours(0, 0, 0, 0);

  while (cur.getTime() <= end.getTime()) {
    const date = ymd(cur);
    const dayLabel = DAY_LABELS[cur.getDay()]; // "월"~"일"
    const dayHolidays = holidayByDate.get(date) ?? [];
    const allClosedHoliday = dayHolidays.find((h) => h.class_id === null);

    for (const c of classes) {
      const dows = (c.days_of_week ?? "").split(/[,\s]+/).filter(Boolean);
      if (!dows.includes(dayLabel)) continue;

      // 전체 휴강이거나 이 클래스 휴강이면 휴강 event 만 (수업 없음)
      const classHoliday = dayHolidays.find((h) => h.class_id === c.id);
      if (allClosedHoliday || classHoliday) {
        events.push({
          date,
          type: "holiday",
          className: c.name,
          classId: c.id,
          time: fmtTimeRange(c.start_time, c.end_time),
          coach: c.coach ?? "",
          color: c.color,
          isMine: c.isMine,
          studentName: c.studentName ?? null,
          note: (classHoliday ?? allClosedHoliday)?.reason ?? "휴강",
        });
        continue;
      }

      events.push({
        date,
        type: "class",
        className: c.name,
        classId: c.id,
        time: fmtTimeRange(c.start_time, c.end_time),
        coach: c.coach ?? "",
        color: c.color,
        isMine: c.isMine,
        studentName: c.studentName ?? null,
      });
    }

    cur.setDate(cur.getDate() + 1);
  }

  // 보강 추가 (해당 날짜의 보강만, 범위 안)
  for (const m of makeups) {
    if (!m.makeup_date) continue;
    if (m.status === "취소") continue;
    if (m.makeup_date < ymd(from) || m.makeup_date > ymd(to)) continue;
    const c = classMap.get(m.class_id);
    if (!c) continue;
    events.push({
      date: m.makeup_date,
      type: "makeup",
      className: c.name,
      classId: c.id,
      time: fmtTimeRange(c.start_time, c.end_time),
      coach: c.coach ?? "",
      color: c.color,
      isMine: c.isMine,
      studentName: c.studentName ?? null,
      note: m.reason ?? "보강",
    });
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.time.localeCompare(b.time);
  });
  return events;
}

// 월 view 의 첫 셀 = 그 달 1일이 속한 주의 일요일.
export function monthGridRange(year: number, month0: number): { from: Date; to: Date } {
  const first = new Date(year, month0, 1);
  const startDow = first.getDay(); // 0=일
  const from = new Date(year, month0, 1 - startDow);
  const last = new Date(year, month0 + 1, 0);
  const endDow = last.getDay();
  const to = new Date(year, month0, last.getDate() + (6 - endDow));
  return { from, to };
}

// 주 view (월요일 시작) range
export function weekRange(anchor: Date): { from: Date; to: Date } {
  const d = new Date(anchor);
  d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=일, 1=월
  const monOffset = dow === 0 ? -6 : 1 - dow;
  const from = new Date(d);
  from.setDate(d.getDate() + monOffset);
  const to = new Date(from);
  to.setDate(from.getDate() + 6);
  return { from, to };
}

export function fmtYmd(d: Date): string {
  return ymd(d);
}

export function shiftMonth(year: number, month0: number, delta: number): { year: number; month0: number } {
  const d = new Date(year, month0 + delta, 1);
  return { year: d.getFullYear(), month0: d.getMonth() };
}

export function shiftWeek(anchor: Date, delta: number): Date {
  const d = new Date(anchor);
  d.setDate(d.getDate() + delta * 7);
  return d;
}
