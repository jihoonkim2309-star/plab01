import Link from "next/link";
import { requireCenter } from "@/lib/center";
import MonthNav from "../MonthNav";
import FilterBar from "../FilterBar";
import FilterSelect from "../FilterSelect";

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

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; class_id?: string }>;
}) {
  const { ym, class_id } = await searchParams;
  const { y, m } = ymParts(ym);
  const monthStr = `${y}-${pad(m)}`;
  const first = new Date(y, m - 1, 1);
  const daysInMonth = new Date(y, m, 0).getDate();
  const lead = first.getDay(); // 앞쪽 빈 칸 수

  const { supabase, centerId: cid } = await requireCenter();
  let classQuery = supabase
    .from("classes")
    .select("id, name, days_of_week, start_time, end_time, place, status")
    .eq("center_id", cid)
    .in("status", ["운영", "모집중"]);
  if (class_id) classQuery = classQuery.eq("id", class_id);

  const { data: allClasses } = await supabase
    .from("classes")
    .select("id, name")
    .eq("center_id", cid)
    .order("name");
  const { data: classes } = await classQuery;
  const { data: holidays } = await supabase
    .from("holidays")
    .select("id, holiday_date, reason, class_id")
    .eq("center_id", cid)
    .gte("holiday_date", `${monthStr}-01`)
    .lte("holiday_date", `${monthStr}-${pad(daysInMonth)}`);
  const { data: makeups } = await supabase
    .from("makeups")
    .select("id, makeup_date, reason, status, class_id, classes(name)")
    .eq("center_id", cid)
    .gte("makeup_date", `${monthStr}-01`)
    .lte("makeup_date", `${monthStr}-${pad(daysInMonth)}`);

  const cls = classes ?? [];
  const hol = ((holidays ?? []) as unknown as {
    id: string;
    holiday_date: string;
    reason: string | null;
    class_id: string | null;
  }[]).filter((h) => !class_id || h.class_id === class_id || !h.class_id);
  const mk = ((makeups ?? []) as unknown as {
    id: string;
    makeup_date: string;
    reason: string | null;
    status: string;
    class_id: string | null;
    classes: { name: string } | null;
  }[]).filter((x) => !class_id || x.class_id === class_id);

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
          <MonthNav ym={monthStr} baseUrl="/admin/schedule" extra={{ class_id }} />
        </div>
      </div>

      <div className="panel">
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <FilterSelect
              param="class_id"
              current={class_id}
              placeholder="클래스 전체"
              ariaLabel="클래스 필터"
              options={(allClasses ?? []).map((c) => ({
                value: c.id,
                label: c.name,
              }))}
            />
            <div style={{ flex: 1 }} />
            {class_id && (
              <Link className="btn" href={`/admin/schedule?ym=${monthStr}`}>초기화</Link>
            )}
          </FilterBar>
        </div>
        <div className="panel-body">
          <div className="calendar">
            {KOR.map((k) => (
              <div className="day-name" key={k}>
                {k}
              </div>
            ))}
            {cells.map((cell, i) => {
              if (!cell.date) return <div className="day outside" key={i} />;
              const dow = KOR[cell.dow];
              const dayHolidays = hol.filter((h) => h.holiday_date === cell.date);
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
              const dayMakeups = mk.filter((x) => x.makeup_date === cell.date);
              return (
                <div className={`day${fullHoliday ? " is-holiday" : ""}`} key={i}>
                  <div className="date">{Number(cell.date.slice(8))}</div>
                  {fullHoliday && (
                    <Link
                      className="event red"
                      href={`/admin/holidays?holiday=${fullHoliday.id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      <strong>전체 휴강</strong>
                      <small>{fullHoliday.reason ?? ""}</small>
                    </Link>
                  )}
                  {!fullHoliday &&
                    todays.map((c) => {
                      const off = holidayClassIds.has(c.id);
                      const offHoliday = off ? dayHolidays.find((h) => h.class_id === c.id) : null;
                      return (
                        <Link
                          className={`event${off ? " red" : ""}`}
                          key={c.id}
                          href={offHoliday ? `/admin/holidays?holiday=${offHoliday.id}` : `/admin/classes?class=${c.id}`}
                          style={{ color: "inherit", textDecoration: "none" }}
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
                        </Link>
                      );
                    })}
                  {dayMakeups.map((x) => (
                    <Link
                      className={`event ${x.status === "취소" ? "" : "orange"}`}
                      key={`mk${x.id}`}
                      href={`/admin/makeups?makeup=${x.id}`}
                      style={{ color: "inherit", textDecoration: "none" }}
                    >
                      <strong>보강 · {x.classes?.name ?? ""}</strong>
                      <small>{x.reason ?? x.status}</small>
                    </Link>
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
