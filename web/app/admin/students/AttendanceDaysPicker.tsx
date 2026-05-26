"use client";

import { useMemo, useState } from "react";

// 클래스 select + 참여 요일 체크박스 통합 컴포넌트.
// - 클래스 변경 시 그 클래스의 운영 요일만 노출
// - 체크된 요일은 hidden input "attendance_days" 에 CSV 로 송신
// - 학생당 단일 클래스 가정 (current schema)

const ALL_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

type ClassOption = {
  id: string;
  name: string;
  days_of_week: string | null;
};

function parseDays(csv: string | null): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function AttendanceDaysPicker({
  classes,
  defaultClassId,
  defaultAttendanceDays,
}: {
  classes: ClassOption[];
  defaultClassId: string | null;
  defaultAttendanceDays: string | null;
}) {
  const [classId, setClassId] = useState(defaultClassId ?? "");
  const [days, setDays] = useState<string[]>(parseDays(defaultAttendanceDays));

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId],
  );
  const operatingDays = useMemo(
    () => (selectedClass ? parseDays(selectedClass.days_of_week) : []),
    [selectedClass],
  );

  // 클래스가 바뀌면 — 새 운영 요일에 없는 기존 선택은 제거
  function onClassChange(newId: string) {
    setClassId(newId);
    const newClass = classes.find((c) => c.id === newId);
    const newOperating = parseDays(newClass?.days_of_week ?? null);
    setDays((prev) => prev.filter((d) => newOperating.includes(d)));
  }

  function toggleDay(d: string) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  const attendanceCsv = days
    .filter((d) => ALL_DAYS.includes(d))
    .sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    .join(",");

  return (
    <>
      <div className="field">
        <label>수강 클래스</label>
        <select
          name="class_id"
          value={classId}
          onChange={(e) => onClassChange(e.target.value)}
        >
          <option value="">선택 안 함</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        {classes.length === 0 && (
          <span className="muted">
            등록된 클래스가 없습니다 — "클래스 관리"에서 먼저 생성하세요.
          </span>
        )}
      </div>

      <div className="field">
        <label>참여 요일 {classId && <span className="muted" style={{ fontWeight: 400 }}>({days.length}회/주)</span>}</label>
        {!classId ? (
          <span className="muted" style={{ fontSize: 12 }}>
            클래스를 먼저 선택하세요.
          </span>
        ) : operatingDays.length === 0 ? (
          <span className="muted" style={{ fontSize: 12 }}>
            이 클래스는 운영 요일이 설정되지 않았습니다 — 클래스 관리에서 days_of_week 를 먼저 설정하세요.
          </span>
        ) : (
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {operatingDays.map((d) => {
              const on = days.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  className={`btn${on ? " primary" : ""}`}
                  style={{ minWidth: 44, padding: "6px 10px" }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        )}
        <input type="hidden" name="attendance_days" value={attendanceCsv} />
      </div>
    </>
  );
}
