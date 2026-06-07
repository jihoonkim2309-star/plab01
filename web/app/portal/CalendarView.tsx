"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Clock, X } from "lucide-react";
import type { EventItem } from "@/lib/calendar";

const DAY_HEADER = ["일", "월", "화", "수", "목", "금", "토"];

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

type View = "month" | "week";

type Props = {
  events: EventItem[];
  initialYear: number;
  initialMonth0: number; // 0~11
  initialWeekFrom: string; // YYYY-MM-DD (월요일)
  selfLabel: "내 자녀" | "내 수업"; // pill 라벨
};

function ymd(d: Date): string {
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

function isSameYmd(a: string, b: string): boolean {
  return a === b;
}

export default function CalendarView({ events, initialYear, initialMonth0, initialWeekFrom, selfLabel }: Props) {
  const [view, setView] = useState<View>("month");
  const [year, setYear] = useState(initialYear);
  const [month0, setMonth0] = useState(initialMonth0);
  const [weekFrom, setWeekFrom] = useState(() => new Date(initialWeekFrom));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const eventsByDate = useMemo(() => {
    const m = new Map<string, EventItem[]>();
    for (const e of events) {
      const list = m.get(e.date) ?? [];
      list.push(e);
      m.set(e.date, list);
    }
    return m;
  }, [events]);

  // 월 그리드 셀들
  const monthCells = useMemo(() => {
    const first = new Date(year, month0, 1);
    const startDow = first.getDay();
    const last = new Date(year, month0 + 1, 0);
    const endDow = last.getDay();
    const startDate = new Date(year, month0, 1 - startDow);
    const endDate = new Date(year, month0, last.getDate() + (6 - endDow));
    const cells: { date: Date; inMonth: boolean }[] = [];
    const cur = new Date(startDate);
    while (cur.getTime() <= endDate.getTime()) {
      cells.push({ date: new Date(cur), inMonth: cur.getMonth() === month0 });
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [year, month0]);

  // 주간 셀들 (월~일)
  const weekCells = useMemo(() => {
    const arr: Date[] = [];
    const start = new Date(weekFrom);
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push(d);
    }
    return arr;
  }, [weekFrom]);

  const todayYmd = ymd(new Date());

  const selectedEvents = selectedDate ? eventsByDate.get(selectedDate) ?? [] : [];

  function moveMonth(delta: number) {
    const d = new Date(year, month0 + delta, 1);
    setYear(d.getFullYear());
    setMonth0(d.getMonth());
  }
  function moveWeek(delta: number) {
    const d = new Date(weekFrom);
    d.setDate(d.getDate() + delta * 7);
    setWeekFrom(d);
  }
  function goToday() {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth0(now.getMonth());
    const dow = now.getDay();
    const monOffset = dow === 0 ? -6 : 1 - dow;
    const wf = new Date(now);
    wf.setDate(now.getDate() + monOffset);
    setWeekFrom(wf);
  }

  return (
    <div>
      {/* view 토글 + 오늘 */}
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        {(["month", "week"] as View[]).map((v) => {
          const on = v === view;
          return (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              style={{
                flex: 1,
                padding: "8px 0",
                borderRadius: 8,
                border: on ? "2px solid var(--brand, #1e794e)" : "1px solid #e5e7eb",
                background: on ? "var(--brand-soft, #d8ecdf)" : "#fff",
                color: on ? "var(--brand, #1e794e)" : "#374151",
                fontWeight: on ? 800 : 600,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {v === "month" ? "월" : "주"}
            </button>
          );
        })}
        <button
          type="button"
          onClick={goToday}
          style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", fontWeight: 700, fontSize: 12, cursor: "pointer" }}
        >
          오늘
        </button>
      </div>

      {/* 헤더 — 월 또는 주 nav */}
      <div className="card" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 12px", marginBottom: 10 }}>
        <button
          type="button"
          onClick={() => (view === "month" ? moveMonth(-1) : moveWeek(-1))}
          aria-label="이전"
          style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4, color: "#6f7d78" }}
        >
          <ChevronLeft size={20} />
        </button>
        <strong style={{ fontSize: 15 }}>
          {view === "month"
            ? `${year}년 ${month0 + 1}월`
            : `${weekCells[0].getFullYear()}.${String(weekCells[0].getMonth() + 1).padStart(2, "0")}.${String(weekCells[0].getDate()).padStart(2, "0")} ~ ${String(weekCells[6].getMonth() + 1).padStart(2, "0")}.${String(weekCells[6].getDate()).padStart(2, "0")}`}
        </strong>
        <button
          type="button"
          onClick={() => (view === "month" ? moveMonth(1) : moveWeek(1))}
          aria-label="다음"
          style={{ background: "transparent", border: 0, cursor: "pointer", padding: 4, color: "#6f7d78" }}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {view === "month" ? (
        <div className="card" style={{ padding: 8 }}>
          {/* 요일 헤더 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: 4 }}>
            {DAY_HEADER.map((d, i) => (
              <div
                key={d}
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  fontWeight: 700,
                  color: i === 0 ? "#b42318" : i === 6 ? "#2563eb" : "#6f7d78",
                  padding: "6px 0",
                }}
              >
                {d}
              </div>
            ))}
          </div>
          {/* 셀들 */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
            {monthCells.map(({ date, inMonth }, idx) => {
              const cellYmd = ymd(date);
              const isToday = cellYmd === todayYmd;
              const isSelected = selectedDate === cellYmd;
              const dayEvents = eventsByDate.get(cellYmd) ?? [];
              const dow = date.getDay();
              const dotColors = Array.from(
                new Set(dayEvents.map((e) => (e.color ? COLOR_MAP[e.color] ?? "#1e794e" : "#1e794e"))),
              ).slice(0, 4);
              const hasHoliday = dayEvents.some((e) => e.type === "holiday");
              const hasMakeup = dayEvents.some((e) => e.type === "makeup");
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setSelectedDate(cellYmd === selectedDate ? null : cellYmd)}
                  style={{
                    aspectRatio: "1",
                    padding: 4,
                    borderRadius: 8,
                    border: isSelected ? "2px solid var(--brand, #1e794e)" : isToday ? "1px solid var(--brand, #1e794e)" : "1px solid transparent",
                    background: isSelected ? "var(--brand-soft, #d8ecdf)" : "transparent",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "flex-start",
                    gap: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: isToday ? 800 : 500,
                      color: !inMonth
                        ? "#d1d5db"
                        : dow === 0
                        ? "#b42318"
                        : dow === 6
                        ? "#2563eb"
                        : "#374151",
                    }}
                  >
                    {date.getDate()}
                  </span>
                  {dayEvents.length > 0 && (
                    <div style={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap", justifyContent: "center" }}>
                      {dotColors.map((c, i) => (
                        <span key={i} style={{ width: 4, height: 4, borderRadius: "50%", background: c }} />
                      ))}
                      {hasHoliday && (
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#b42318" }} />
                      )}
                      {hasMakeup && (
                        <span style={{ width: 4, height: 4, borderRadius: "50%", background: "#d97706" }} />
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        // 주 view
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {weekCells.map((date) => {
            const cellYmd = ymd(date);
            const isToday = cellYmd === todayYmd;
            const dayEvents = eventsByDate.get(cellYmd) ?? [];
            const dow = date.getDay();
            return (
              <section
                key={cellYmd}
                className="card"
                style={{
                  padding: 12,
                  borderLeft: isToday ? "3px solid var(--brand, #1e794e)" : undefined,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: dayEvents.length ? "var(--brand)" : "#f1f5f4",
                      color: dayEvents.length ? "#fff" : "#9ca3af",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: 10, lineHeight: 1, fontWeight: 600, opacity: 0.85 }}>
                      {DAY_HEADER[dow]}
                    </span>
                    <strong style={{ fontSize: 14, lineHeight: 1.1 }}>{date.getDate()}</strong>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {dayEvents.length === 0 ? (
                      <div style={{ fontSize: 12, color: "#9ca3af" }}>일정 없음</div>
                    ) : (
                      dayEvents.map((e, i) => <EventRow key={i} ev={e} selfLabel={selfLabel} />)
                    )}
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* 월 view 의 선택된 날짜 상세 (시트) */}
      {view === "month" && selectedDate && (
        <DayDetail
          dateYmd={selectedDate}
          events={selectedEvents}
          onClose={() => setSelectedDate(null)}
          selfLabel={selfLabel}
        />
      )}
    </div>
  );
}

function EventRow({ ev, selfLabel }: { ev: EventItem; selfLabel: "내 자녀" | "내 수업" }) {
  const dot = ev.color ? COLOR_MAP[ev.color] ?? "#1e794e" : "#1e794e";
  return (
    <div style={{ marginTop: 6, opacity: !ev.isMine ? 0.7 : 1 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        <span style={{ width: 8, height: 8, borderRadius: "50%", background: ev.type === "holiday" ? "#b42318" : dot, display: "inline-block", flexShrink: 0 }} />
        <strong style={{ fontSize: 13 }}>{ev.className}</strong>
        {ev.type === "holiday" && (
          <span style={{ fontSize: 10, color: "#b42318", fontWeight: 800, background: "#fee2e2", padding: "1px 6px", borderRadius: 4 }}>
            휴강
          </span>
        )}
        {ev.type === "makeup" && (
          <span style={{ fontSize: 10, color: "#d97706", fontWeight: 800, background: "#fef3c7", padding: "1px 6px", borderRadius: 4 }}>
            보강
          </span>
        )}
        {ev.studentName && (
          <span style={{ fontSize: 11, color: "var(--brand)", fontWeight: 700, background: "var(--brand-soft, #d8ecdf)", padding: "1px 6px", borderRadius: 4 }}>
            {ev.studentName}
          </span>
        )}
        {ev.isMine && !ev.studentName && (
          <span style={{ fontSize: 10, color: "var(--brand)", fontWeight: 800, background: "var(--brand-soft, #d8ecdf)", padding: "1px 6px", borderRadius: 4 }}>
            {selfLabel}
          </span>
        )}
      </div>
      <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
        <Clock size={12} /> {ev.time}{ev.coach && ` · ${ev.coach}`}
        {ev.note && ev.type !== "class" && (
          <span style={{ marginLeft: 6, color: "#9ca3af" }}>· {ev.note}</span>
        )}
      </div>
    </div>
  );
}

function DayDetail({
  dateYmd,
  events,
  onClose,
  selfLabel,
}: {
  dateYmd: string;
  events: EventItem[];
  onClose: () => void;
  selfLabel: "내 자녀" | "내 수업";
}) {
  const d = new Date(dateYmd + "T00:00:00");
  const label = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} (${DAY_HEADER[d.getDay()]})`;
  return (
    <section className="card" style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <strong style={{ fontSize: 14 }}>{label}</strong>
        <button
          type="button"
          onClick={onClose}
          aria-label="닫기"
          style={{ background: "transparent", border: 0, cursor: "pointer", color: "#9ca3af", padding: 4 }}
        >
          <X size={18} />
        </button>
      </div>
      {events.length === 0 ? (
        <div style={{ fontSize: 12, color: "#9ca3af", padding: "8px 0" }}>이 날 일정이 없습니다.</div>
      ) : (
        events.map((e, i) => <EventRow key={i} ev={e} selfLabel={selfLabel} />)
      )}
    </section>
  );
}
