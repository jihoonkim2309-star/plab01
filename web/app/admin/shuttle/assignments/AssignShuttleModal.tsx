"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { assignShuttle } from "./actions";

type RouteOption = {
  id: string;
  name: string;
  direction: string | null;
};
type StopOption = {
  id: string;
  route_id: string;
  sequence: number | null;
  name: string;
};
type StudentOption = {
  id: string;
  name: string;
};

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
  backUrl,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  routes: RouteOption[];
  stops: StopOption[];
  students: StudentOption[];
  fixedStudentId?: string;
  fixedRouteId?: string;
  backUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [studentId, setStudentId] = useState(fixedStudentId ?? "");
  const [routeId, setRouteId] = useState(fixedRouteId ?? "");
  const [boardId, setBoardId] = useState("");
  const [alightId, setAlightId] = useState("");
  const [direction, setDirection] = useState("");

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
    }
  }, [open, fixedStudentId, fixedRouteId]);

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
                          }}
                        >
                          {fixedStudentName}
                        </div>
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
                        </div>
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
                          {students.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
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
