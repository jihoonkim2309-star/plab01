"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useMeasurementDrawer } from "./MeasurementDrawerContext";
import {
  approveMeasurement,
  deleteMeasurement,
  rejectMeasurement,
  reopenMeasurement,
  saveMeasurement,
  submitMeasurement,
} from "./actions";
import ConfirmButton from "../ConfirmButton";

type Student = {
  id: string;
  name: string;
  school: string | null;
  grade: string | null;
  gender: string | null;
  birth: string | null;
  status: string;
};

type Measurement = {
  id: string;
  status: string;
  measured_at: string | null;
  reviewed_at: string | null;
  reject_reason: string | null;
  notes: string | null;
};

type Value = {
  item_id: string;
  value_num: number | null;
  value_text: string | null;
};

type Detail = {
  student: Student;
  measurement: Measurement | null;
  values: Value[];
};

export type MeasurementItem = {
  id: string;
  category: string;
  name: string;
  unit: string | null;
  value_kind: string;
  sort_order: number;
};

const STATUS_BADGE: Record<string, string> = {
  대기: "gray",
  입력완료: "blue",
  승인완료: "green",
  반려: "red",
};

export default function MeasurementDetailDrawer({
  ym,
  items,
  isAdmin,
}: {
  ym: string;
  items: MeasurementItem[];
  isAdmin: boolean;
}) {
  const { studentId } = useMeasurementDrawer();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!studentId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    let cancelled = false;
    fetch(`/api/admin/measurements/${studentId}/detail?ym=${ym}`)
      .then((r) => r.json())
      .then((d: Detail) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [studentId, ym]);

  const selected = data?.student;
  const m = data?.measurement;
  const values = data?.values ?? [];
  const valById = new Map(values.map((v) => [v.item_id, v]));

  // 카테고리별 그룹
  const groups = new Map<string, MeasurementItem[]>();
  for (const it of items) {
    const arr = groups.get(it.category) ?? [];
    arr.push(it);
    groups.set(it.category, arr);
  }

  return (
    <div className="panel elevated">
      {!studentId ? (
        <>
          <div className="panel-head">
            <p className="panel-title">측정 입력</p>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <strong>학생을 선택하세요</strong>
              <p>좌측에서 학생을 선택하면 항목별 측정값을 입력할 수 있습니다.</p>
            </div>
          </div>
        </>
      ) : loading ? (
        <>
          <div className="panel-head">
            <p className="panel-title">측정 입력</p>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <div className="muted">불러오는 중...</div>
            </div>
          </div>
        </>
      ) : !selected ? (
        <>
          <div className="panel-head">
            <p className="panel-title">측정 입력</p>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <strong>학생을 찾을 수 없습니다</strong>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="panel-head">
            <p className="panel-title">
              <Link
                href={`/admin/students?student=${selected.id}`}
                style={{ color: "var(--text)" }}
              >
                {selected.name}
              </Link>{" "}
              · {ym}
            </p>
            <span className={`badge ${STATUS_BADGE[m?.status ?? "대기"] ?? "gray"}`}>
              {m?.status ?? "대기"}
            </span>
          </div>

          {items.length === 0 ? (
            <div className="panel-body">
              <div className="empty-state">
                <strong>측정 항목이 없습니다</strong>
                <p>
                  먼저{" "}
                  <Link href="/admin/measurement-items">측정 항목 관리</Link>
                  에서 항목을 등록(또는 시드 적용)하세요.
                </p>
              </div>
            </div>
          ) : (
            <div className="panel-body">
              {m?.reject_reason && (
                <div
                  className="panel"
                  style={{
                    background: "var(--red-soft, #fdecec)",
                    borderColor: "#f3b1b1",
                    padding: "10px 12px",
                    marginBottom: 12,
                  }}
                >
                  <strong>반려 사유</strong> · {m.reject_reason}
                </div>
              )}

              <form action={saveMeasurement} className="form-grid">
                <input type="hidden" name="student_id" value={selected.id} />
                <input type="hidden" name="ym" value={ym} />

                {[...groups.entries()].map(([cat, arr]) => (
                  <div key={cat} className="span-2">
                    <h3
                      style={{
                        margin: "12px 0 8px",
                        fontSize: 14,
                        fontWeight: 700,
                      }}
                    >
                      {cat}
                    </h3>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: 8,
                      }}
                    >
                      {arr.map((it) => {
                        const v = valById.get(it.id);
                        const dv =
                          v?.value_num != null
                            ? String(v.value_num)
                            : (v?.value_text ?? "");
                        return (
                          <div key={it.id} className="field">
                            <label>
                              {it.name}
                              {it.unit ? (
                                <span className="muted"> ({it.unit})</span>
                              ) : null}
                            </label>
                            <input
                              name={`v_${it.id}`}
                              type={it.value_kind === "number" ? "number" : "text"}
                              step="any"
                              defaultValue={dv}
                              required
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                <div className="field span-2">
                  <label>메모</label>
                  <textarea
                    name="notes"
                    defaultValue={m?.notes ?? ""}
                    rows={2}
                  />
                </div>

                <div
                  className="span-2 toolbar"
                  style={{ justifyContent: "flex-start" }}
                >
                  <button className="btn primary" type="submit">
                    저장
                  </button>
                </div>
              </form>

              {/* 상태 전환 */}
              {m && (
                <div
                  className="toolbar"
                  style={{ justifyContent: "flex-start", marginTop: 8 }}
                >
                  {(m.status === "대기" || m.status === "반려") && (
                    <form action={submitMeasurement}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn" type="submit">
                        입력 완료로 처리
                      </button>
                    </form>
                  )}
                  {m.status === "입력완료" && isAdmin && (
                    <>
                      <form action={approveMeasurement}>
                        <input type="hidden" name="id" value={m.id} />
                        <button className="btn primary" type="submit">
                          승인
                        </button>
                      </form>
                      <form action={rejectMeasurement}>
                        <input type="hidden" name="id" value={m.id} />
                        <input
                          name="reject_reason"
                          placeholder="반려 사유 (필수)"
                          required
                          minLength={2}
                          style={{ width: 200 }}
                        />
                        <button className="btn" type="submit">
                          반려
                        </button>
                      </form>
                    </>
                  )}
                  {isAdmin && m.status !== "대기" && (
                    <form action={reopenMeasurement}>
                      <input type="hidden" name="id" value={m.id} />
                      <button className="btn" type="submit">
                        다시 입력으로
                      </button>
                    </form>
                  )}
                  {isAdmin && (
                    <form action={deleteMeasurement}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name="ym" value={ym} />
                      <ConfirmButton
                        message={`'${selected.name}'의 ${ym} 측정값을 삭제할까요? 입력값이 모두 사라집니다.`}
                        className="btn danger"
                        type="submit"
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
