"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { assignShuttle } from "./actions";

const ALL_DAYS = ["월", "화", "수", "목", "금", "토", "일"];
const WD_BY_NUM = ["일", "월", "화", "수", "목", "금", "토"]; // shuttle_runs.weekday: 0=일~6=토

type RunInfo = {
  weekday: number;
  start_time: string; // HH:MM:SS
  end_time?: string | null;
};
type RouteOption = {
  id: string;
  name: string;
  direction: string | null;
  runs?: RunInfo[];
};
type StopOption = {
  id: string;
  route_id: string;
  sequence: number | null;
  name: string;
};
type EnrollmentStatus = "수강중" | "결제대기" | "신규" | "상담중";

type StudentOption = {
  id: string;
  name: string;
  attendance_days?: string | null;
  class_name?: string | null;
  class_start_time?: string | null;
  class_end_time?: string | null;
  enrollment_status?: EnrollmentStatus | null;
};

const STATUS_BADGE_CLASS: Record<EnrollmentStatus, string> = {
  수강중: "green",
  결제대기: "orange",
  신규: "gray",
  상담중: "blue",
};

const STATUS_NOTE: Record<EnrollmentStatus, string | null> = {
  수강중: null,
  결제대기: "이번달 결제대기 상태입니다 — 셔틀 배정은 진행 가능합니다.",
  신규: "청구서 미발행 (신규 등록) 상태입니다 — 셔틀 배정은 진행 가능합니다.",
  상담중: "상담중 상태입니다 — 정식 등록 전이지만 셔틀 배정은 진행 가능합니다.",
};

function parseDays(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

function hhmm(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}

// 두 가지 진입 모드 (수강 배정 모달과 동일 패턴):
// 1) 학생 컨텍스트 — fixedStudentId. routes select.
// 2) 노선 컨텍스트 — fixedRouteId. students select.
export default function AssignShuttleModal({
  triggerLabel = "셔틀 배정",
  triggerClassName = "btn",
  routes,
  stops,
  students,
  fixedStudentId,
  fixedRouteId,
  fixedRunWeekday,
  backUrl,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  routes: RouteOption[];
  stops: StopOption[];
  students: StudentOption[];
  fixedStudentId?: string;
  fixedRouteId?: string;
  fixedRunWeekday?: number; // 운행 컨텍스트 진입 시: 0=일~6=토. weekdays default 에 자동 포함
  backUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState(fixedStudentId ?? "");
  const [routeId, setRouteId] = useState(fixedRouteId ?? "");
  const [boardId, setBoardId] = useState("");
  const [alightId, setAlightId] = useState("");
  const [direction, setDirection] = useState("");
  const [weekdays, setWeekdays] = useState<string[]>([]);
  const [weekdaysTouched, setWeekdaysTouched] = useState(false);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open]);

  // 모달 열 때마다 리셋
  useEffect(() => {
    if (open) {
      setStudentId(fixedStudentId ?? "");
      setRouteId(fixedRouteId ?? "");
      setBoardId("");
      setAlightId("");
      setDirection("");
      setWeekdays([]);
      setWeekdaysTouched(false);
    }
  }, [open, fixedStudentId, fixedRouteId]);

  // 학생이 바뀌면 수강 attendance_days 를 weekdays default 로 자동 채움
  // (사용자가 수동 변경하면 그 선택 유지)
  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId) ?? null,
    [students, studentId],
  );
  const suggestedDays = useMemo(
    () => parseDays(selectedStudent?.attendance_days),
    [selectedStudent],
  );
  // 운행 컨텍스트 진입 요일이 학생 수강 요일에 없으면 ⚠ 안내 (자동 추가는 안 함)
  const runDayLabel = fixedRunWeekday != null ? WD_BY_NUM[fixedRunWeekday] : null;
  const runDayMismatch =
    !!runDayLabel &&
    suggestedDays.length > 0 &&
    !suggestedDays.includes(runDayLabel);
  useEffect(() => {
    if (weekdaysTouched) return;
    if (!studentId) return;
    setWeekdays(suggestedDays);
  }, [studentId, suggestedDays, weekdaysTouched]);

  function toggleDay(d: string) {
    setWeekdaysTouched(true);
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  const selectedRoute = useMemo(
    () => routes.find((r) => r.id === routeId) ?? null,
    [routes, routeId],
  );
  const routeStops = useMemo(
    () =>
      stops
        .filter((s) => s.route_id === routeId)
        .sort((a, b) => (a.sequence ?? 0) - (b.sequence ?? 0)),
    [stops, routeId],
  );

  // 노선 변경 시 정류장 선택 리셋 + direction 자동 채움
  function onRouteChange(v: string) {
    setRouteId(v);
    setBoardId("");
    setAlightId("");
    const r = routes.find((x) => x.id === v);
    if (r?.direction) setDirection(r.direction);
  }

  const fixedRouteName =
    fixedRouteId && (routes.find((r) => r.id === fixedRouteId)?.name ?? "");
  const fixedStudentName =
    fixedStudentId &&
    (students.find((s) => s.id === fixedStudentId)?.name ?? "");

  return (
    <>
      <button
        type="button"
        className={triggerClassName}
        onClick={() => setOpen(true)}
      >
        {triggerLabel}
      </button>
      {open && mounted &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <form
              action={assignShuttle}
              className="modal-card"
              style={{ maxWidth: 520 }}
            >
              <input type="hidden" name="back" value={backUrl} />
              <div className="panel-head" style={{ padding: "16px 20px 8px" }}>
                <p className="panel-title">셔틀 배정</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                  style={{ minHeight: 30, padding: "4px 10px" }}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              <div className="panel-body" style={{ padding: "8px 20px 16px" }}>
                <div className="form-grid">
                  {fixedStudentId ? (
                    <>
                      <input type="hidden" name="student_id" value={fixedStudentId} />
                      <div className="field span-2">
                        <label>학생</label>
                        <div
                          style={{
                            padding: "9px 12px",
                            background: "var(--bg)",
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            fontWeight: 700,
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <span>{fixedStudentName}</span>
                          {selectedStudent?.enrollment_status && (
                            <span
                              className={`badge ${STATUS_BADGE_CLASS[selectedStudent.enrollment_status]}`}
                              style={{ fontSize: 11 }}
                            >
                              {selectedStudent.enrollment_status}
                            </span>
                          )}
                        </div>
                        {selectedStudent?.enrollment_status &&
                          STATUS_NOTE[selectedStudent.enrollment_status] && (
                            <span className="muted" style={{ fontSize: 12 }}>
                              ⓘ {STATUS_NOTE[selectedStudent.enrollment_status]}
                            </span>
                          )}
                      </div>
                      <div className="field span-2">
                        <label>노선 *</label>
                        <select
                          name="route_id"
                          value={routeId}
                          onChange={(e) => onRouteChange(e.target.value)}
                        >
                          <option value="">미이용 (배정 해제)</option>
                          {routes.map((r) => (
                            <option key={r.id} value={r.id}>
                              {r.name}
                              {r.direction ? ` (${r.direction})` : ""}
                            </option>
                          ))}
                        </select>
                        {selectedRoute && (selectedRoute.runs?.length ?? 0) > 0 && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            운행 시간:{" "}
                            {selectedRoute.runs!
                              .slice()
                              .sort(
                                (a, b) =>
                                  a.weekday - b.weekday ||
                                  a.start_time.localeCompare(b.start_time),
                              )
                              .map((r) =>
                                `${WD_BY_NUM[r.weekday]} ${hhmm(r.start_time)}${r.end_time ? `~${hhmm(r.end_time)}` : ""}`,
                              )
                              .join(" · ")}
                          </span>
                        )}
                        {selectedRoute && (selectedRoute.runs?.length ?? 0) === 0 && (
                          <span
                            className="muted"
                            style={{ fontSize: 12, color: "var(--orange)" }}
                          >
                            ⚠ 이 노선에 운행 일정이 없습니다. "운행 일정"에서 먼저 추가하세요.
                          </span>
                        )}
                        <span className="muted" style={{ fontSize: 12 }}>
                          미이용 선택 시 활성 배정이 해제되고 학생 셔틀 상태가 미이용으로 전환됩니다.
                        </span>
                      </div>
                    </>
                  ) : (
                    <>
                      <input type="hidden" name="route_id" value={fixedRouteId ?? ""} />
                      <div className="field span-2">
                        <label>노선</label>
                        <div
                          style={{
                            padding: "9px 12px",
                            background: "var(--bg)",
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            fontWeight: 700,
                          }}
                        >
                          {fixedRouteName}
                          {fixedRunWeekday != null && (
                            <span
                              className="muted"
                              style={{ marginLeft: 8, fontWeight: 400, fontSize: 12 }}
                            >
                              · 진입 운행: {WD_BY_NUM[fixedRunWeekday]}
                            </span>
                          )}
                        </div>
                        {(() => {
                          const r = routes.find((x) => x.id === fixedRouteId);
                          const rs = r?.runs ?? [];
                          if (rs.length === 0) return null;
                          return (
                            <span className="muted" style={{ fontSize: 12 }}>
                              운행 시간:{" "}
                              {rs
                                .slice()
                                .sort(
                                  (a, b) =>
                                    a.weekday - b.weekday ||
                                    a.start_time.localeCompare(b.start_time),
                                )
                                .map((r) =>
                                  `${WD_BY_NUM[r.weekday]} ${hhmm(r.start_time)}${r.end_time ? `~${hhmm(r.end_time)}` : ""}`,
                                )
                                .join(" · ")}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="field span-2">
                        <label>학생 *</label>
                        <select
                          name="student_id"
                          value={studentId}
                          onChange={(e) => setStudentId(e.target.value)}
                          required
                        >
                          <option value="">선택</option>
                          {students.map((s) => {
                            const days = s.attendance_days ? ` ${s.attendance_days}` : "";
                            const t = s.class_end_time
                              ? ` ~${hhmm(s.class_end_time)}`
                              : s.class_start_time
                                ? ` ${hhmm(s.class_start_time)}~`
                                : "";
                            const cls = s.class_name ? ` · ${s.class_name}${days}${t}` : "";
                            const stat =
                              s.enrollment_status && s.enrollment_status !== "수강중"
                                ? ` [${s.enrollment_status}]`
                                : "";
                            return (
                              <option key={s.id} value={s.id}>
                                {s.name}{stat}{cls}
                              </option>
                            );
                          })}
                        </select>
                        {selectedStudent && (
                          <span
                            className="muted"
                            style={{
                              fontSize: 12,
                              display: "flex",
                              gap: 6,
                              alignItems: "center",
                              flexWrap: "wrap",
                            }}
                          >
                            {selectedStudent.enrollment_status && (
                              <span
                                className={`badge ${STATUS_BADGE_CLASS[selectedStudent.enrollment_status]}`}
                                style={{ fontSize: 11 }}
                              >
                                {selectedStudent.enrollment_status}
                              </span>
                            )}
                            {selectedStudent.class_name && (
                              <span>
                                수강: {selectedStudent.class_name}
                                {selectedStudent.attendance_days ? ` · ${selectedStudent.attendance_days}` : ""}
                                {selectedStudent.class_start_time
                                  ? ` · ${hhmm(selectedStudent.class_start_time)}${selectedStudent.class_end_time ? `~${hhmm(selectedStudent.class_end_time)}` : ""}`
                                  : ""}
                              </span>
                            )}
                          </span>
                        )}
                        {selectedStudent?.enrollment_status &&
                          STATUS_NOTE[selectedStudent.enrollment_status] && (
                            <span className="muted" style={{ fontSize: 12 }}>
                              ⓘ {STATUS_NOTE[selectedStudent.enrollment_status]}
                            </span>
                          )}
                      </div>
                    </>
                  )}

                  {routeId && (
                    <>
                      <div className="field">
                        <label>승차 정류장</label>
                        <select
                          name="board_stop_id"
                          value={boardId}
                          onChange={(e) => setBoardId(e.target.value)}
                        >
                          <option value="">미지정</option>
                          {routeStops.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.sequence != null ? `${s.sequence}. ` : ""}
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field">
                        <label>하차 정류장</label>
                        <select
                          name="alight_stop_id"
                          value={alightId}
                          onChange={(e) => setAlightId(e.target.value)}
                        >
                          <option value="">미지정</option>
                          {routeStops.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.sequence != null ? `${s.sequence}. ` : ""}
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="field span-2">
                        <label>방향</label>
                        <select
                          name="direction"
                          value={direction}
                          onChange={(e) => setDirection(e.target.value)}
                        >
                          <option value="">노선 기본값 사용</option>
                          <option value="등교">등교</option>
                          <option value="하교">하교</option>
                          <option value="순환">순환</option>
                        </select>
                        {selectedRoute?.direction && !direction && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            노선 기본 방향: {selectedRoute.direction}
                          </span>
                        )}
                      </div>
                      <div className="field span-2">
                        <label>
                          이용 요일{" "}
                          <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                            ({weekdays.length}회/주)
                          </span>
                        </label>
                        {weekdays.map((d) => (
                          <input
                            key={d}
                            type="hidden"
                            name="weekdays"
                            value={d}
                          />
                        ))}
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                          {ALL_DAYS.map((d) => {
                            const on = weekdays.includes(d);
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
                        {!weekdaysTouched && suggestedDays.length > 0 && (
                          <span className="muted" style={{ fontSize: 12 }}>
                            수강 요일 ({suggestedDays.join(",")}) 기준 자동 적용. 셔틀만 다른 요일이면 수동 조정.
                          </span>
                        )}
                        {!weekdaysTouched && studentId && suggestedDays.length === 0 && (
                          <span
                            className="muted"
                            style={{ fontSize: 12, color: "var(--orange)" }}
                          >
                            ⚠ 학생의 수강 요일이 비어있어 자동 적용할 값이 없습니다. 직접 체크하세요.
                          </span>
                        )}
                        {runDayMismatch && (
                          <span
                            className="muted"
                            style={{ fontSize: 12, color: "var(--orange)" }}
                          >
                            ⚠ 진입 운행은 {runDayLabel}요일인데 이 학생은 그날 수강하지 않습니다. 그래도 배정하려면 위에서 {runDayLabel} 체크하세요.
                          </span>
                        )}
                      </div>
                      {routeStops.length === 0 && (
                        <div className="field span-2">
                          <span
                            className="muted"
                            style={{ fontSize: 12, color: "var(--orange)" }}
                          >
                            ⚠ 이 노선에 등록된 정류장이 없습니다. "노선/정류장 관리"에서 먼저 추가하세요.
                          </span>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn primary">
                  배정 저장
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
