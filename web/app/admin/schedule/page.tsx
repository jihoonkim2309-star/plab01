import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const KOR = ["일", "월", "화", "수", "목", "금", "토"];

function ymParts(ym?: string) {
  const now = new Date();
  let y = now.getFullYear();
  let m = now.getMonth() + 1;
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    y = Number(ym.slice(0, 4));
    m = Number(ym.slice(5, 7));
  }
  return { y, m };
}
const pad = (n: number) => String(n).padStart(2, "0");
const shift = (y: number, m: number, d: number) => {
  const t = new Date(y, m - 1 + d, 1);
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}`;
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const { y, m } = ymParts(ym);
  const monthStr = `${y}-${pad(m)}`;
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = first.getDay(); // 앞쪽 빈 칸 수

  const supabase = await createClient();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, days_of_week, start_time, end_time, place, status")
    .in("status", ["운영", "모집중"]);
  const { data: holidays } = await supabase
    .from("holidays")
    .select("holiday_date, reason, class_id")
    .gte("holiday_date", `${monthStr}-01`)
    .lte("holiday_date", `${monthStr}-${pad(daysInMonth)}`);
  const { data: makeups } = await supabase
    .from("makeups")
    .select("makeup_date, reason, status, classes(name)")
    .gte("makeup_date", `${monthStr}-01`)
    .lte("makeup_date", `${monthStr}-${pad(daysInMonth)}`);

  const cls = classes ?? [];
  const hol = holidays ?? [];
  const mk = (makeups ?? []) as unknown as {
    makeup_date: string;
    reason: string | null;
    status: string;
    classes: { name: string } | null;
  }[];

  // 6주 x 7일 그리드
  const cells: { date: string | null; dow: number }[] = [];
  for (let i = 0; i < lead; i++) cells.push({ date: null, dow: i });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: `${monthStr}-${pad(d)}`, dow: (lead + d - 1) % 7 });
  while (cells.length % 7 !== 0)
    cells.push({ date: null, dow: cells.length % 7 });

  return (
    <>
      <div className="page-head">
        <div>
          <h1>월간 시간표</h1>
          <p className="subtext">클래스 요일/시간 기반 · 휴강·보강 반영</p>
        </div>
        <div className="toolbar">
          <Link className="btn" href={`/admin/schedule?ym=${shift(y, m, -1)}`}>
            ← 이전달
          </Link>
          <span className="btn" style={{ pointerEvents: "none" }}>
            {y}년 {m}월
          </span>
          <Link className="btn" href={`/admin/schedule?ym=${shift(y, m, 1)}`}>
            다음달 →
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-body">
          <div className="calendar">
            {KOR.map((k) => (
              <div className="day-name" key={k}>
                {k}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell.date)
                return <div className="day outside" key={i} />;
              const dow = KOR[cell.dow];
              const dayHolidays = hol.filter(
                (h) => h.holiday_date === cell.date,
              );
              const fullHoliday = dayHolidays.find((h) => !h.class_id);
              const holidayClassIds = new Set(
                dayHolidays.filter((h) => h.class_id).map((h) => h.class_id),
              );
              const todays = cls.filter((c) =>
                (c.days_of_week ?? "")
                  .split(",")
                  .map((s: string) => s.trim())
                  .includes(dow),
              );
              const dayMakeups = mk.filter(
                (x) => x.makeup_date === cell.date,
              );
              return (
                <div
                  className={`day${fullHoliday ? " is-holiday" : ""}`}
                  key={i}
                >
                  <div className="date">{Number(cell.date.slice(8))}</div>
                  {fullHoliday && (
                    <span className="event red">
                      <strong>전체 휴강</strong>
                      <small>{fullHoliday.reason ?? ""}</small>
                    </span>
                  )}
                  {!fullHoliday &&
                    todays.map((c) => {
                      const off = holidayClassIds.has(c.id);
                      return (
                        <span
                          className={`event${off ? " red" : ""}`}
                          key={c.id}
                        >
                          <strong>
                            {c.name}
                            {off ? " (휴강)" : ""}
                          </strong>
                          <small>
                            {(c.start_time ?? "").slice(0, 5)}
                            {c.end_time ? `~${c.end_time.slice(0, 5)}` : ""}
                            {c.place ? ` · ${c.place}` : ""}
                          </small>
                        </span>
                      );
                    })}
                  {dayMakeups.map((x, j) => (
                    <span
                      className={`event ${x.status === "취소" ? "" : "orange"}`}
                      key={`mk${j}`}
                    >
                      <strong>보강 · {x.classes?.name ?? ""}</strong>
                      <small>{x.reason ?? x.status}</small>
                    </span>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
