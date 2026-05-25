"use client";

// 학생-정류장 배정 폼.
// 노선 선택 시 정류장 드롭다운이 그 노선의 정류장으로 동적 필터.

import Link from "next/link";
import { useState } from "react";
import BackLink from "../../BackLink";
import ConfirmButton from "../../ConfirmButton";

type Stop = { id: string; route_id: string; name: string; sequence: number };

type Assignment = {
  id?: string;
  student_id?: string;
  route_id?: string | null;
  board_stop_id?: string | null;
  alight_stop_id?: string | null;
  direction?: string | null;
  status?: string | null;
};

export default function AssignmentForm({
  assignment,
  students,
  routes,
  stops,
  action,
  title,
  submitLabel,
  cancelHref,
  backLabel = "배정 목록",
  deleteAction,
}: {
  assignment?: Assignment;
  students: { id: string; name: string; school: string | null; grade: string | null }[];
  routes: { id: string; name: string; direction: string }[];
  stops: Stop[];
  action: (formData: FormData) => void;
  title: string;
  submitLabel: string;
  cancelHref: string;
  backLabel?: string;
  deleteAction?: (formData: FormData) => void;
}) {
  const a = assignment ?? {};
  const isEdit = !!a.id;
  const [routeId, setRouteId] = useState(a.route_id ?? "");
  const [boardStop, setBoardStop] = useState(a.board_stop_id ?? "");
  const [alightStop, setAlightStop] = useState(a.alight_stop_id ?? "");

  const stopsOfRoute = stops
    .filter((s) => s.route_id === routeId)
    .sort((x, y) => x.sequence - y.sequence);

  function onRouteChange(v: string) {
    setRouteId(v);
    // 노선 바뀌면 정류장 초기화
    setBoardStop("");
    setAlightStop("");
  }

  return (
    <form action={action}>
      <div className="page-head">
        <div>
          <BackLink href={cancelHref} label={backLabel} />
          <h1>{title}</h1>
        </div>
        <div className="toolbar">
          {isEdit && deleteAction && (
            <ConfirmButton
              message="이 배정을 삭제할까요?"
              className="btn danger"
              type="submit"
              formAction={deleteAction}
              formNoValidate
            >
              삭제
            </ConfirmButton>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">배정 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field span-2">
              <label>학생 *</label>
              <select name="student_id" defaultValue={a.student_id ?? ""} required>
                <option value="" disabled>학생 선택</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                    {(s.school || s.grade) ? ` (${[s.school, s.grade].filter(Boolean).join(" ")})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>방향</label>
              <select name="direction" defaultValue={a.direction ?? ""}>
                <option value="">공통 (등하교 모두)</option>
                <option value="등교">등교</option>
                <option value="하교">하교</option>
                <option value="순환">순환</option>
              </select>
            </div>
            <div className="field">
              <label>상태</label>
              <select name="status" defaultValue={a.status ?? "활성"}>
                <option value="활성">활성</option>
                <option value="중지">중지</option>
              </select>
            </div>
            <div className="field span-2">
              <label>노선</label>
              <select
                name="route_id"
                value={routeId}
                onChange={(e) => onRouteChange(e.target.value)}
              >
                <option value="">노선 미배정</option>
                {routes.map((r) => (
                  <option key={r.id} value={r.id}>
                    [{r.direction}] {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>탑승 정류장</label>
              <select
                name="board_stop_id"
                value={boardStop}
                onChange={(e) => setBoardStop(e.target.value)}
                disabled={!routeId}
              >
                <option value="">{routeId ? "선택 없음" : "노선 먼저 선택"}</option>
                {stopsOfRoute.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>하차 정류장</label>
              <select
                name="alight_stop_id"
                value={alightStop}
                onChange={(e) => setAlightStop(e.target.value)}
                disabled={!routeId}
              >
                <option value="">{routeId ? "선택 없음" : "노선 먼저 선택"}</option>
                {stopsOfRoute.map((s, i) => (
                  <option key={s.id} value={s.id}>
                    {i + 1}. {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {routes.length === 0 && (
            <p className="muted" style={{ fontSize: 12, marginTop: 8 }}>
              등록된 노선이 없습니다. <Link href="/admin/shuttle/routes/new">노선 먼저 등록</Link>
            </p>
          )}
          <div className="detail-actions">
            <Link className="btn" href={cancelHref}>취소</Link>
            <button className="btn primary" type="submit">{submitLabel}</button>
          </div>
        </div>
      </div>
    </form>
  );
}
