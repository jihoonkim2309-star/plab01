"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { assignEnrollment } from "./actions";

const ALL_DAYS = ["월", "화", "수", "목", "금", "토", "일"];

type ClassOption = {
  id: string;
  name: string;
  days_of_week: string | null;
};
type ProductOption = {
  id: string;
  name: string;
  sessions_per_week: number | null;
  price: number | null;
};
type StudentOption = {
  id: string;
  name: string;
};

function parseDays(csv: string | null): string[] {
  if (!csv) return [];
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

// 두 가지 진입 모드:
// 1) 클래스 컨텍스트 — classes 1개 고정, students 목록 select. fixedClassId 지정.
// 2) 학생 컨텍스트 — students 1명 고정, classes 목록 select. fixedStudentId 지정.
export default function AssignEnrollmentModal({
  triggerLabel = "수강 배정",
  triggerClassName = "btn",
  classes,
  products,
  students,
  fixedClassId,
  fixedStudentId,
  backUrl,
}: {
  triggerLabel?: string;
  triggerClassName?: string;
  classes: ClassOption[];
  products: ProductOption[];
  students: StudentOption[];
  fixedClassId?: string;
  fixedStudentId?: string;
  backUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [classId, setClassId] = useState(fixedClassId ?? "");
  const [studentId, setStudentId] = useState(fixedStudentId ?? "");
  const [days, setDays] = useState<string[]>([]);
  const [productId, setProductId] = useState("");
  const [touched, setTouched] = useState(false);

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

  // 모달 열 때마다 폼 리셋
  useEffect(() => {
    if (open) {
      setClassId(fixedClassId ?? "");
      setStudentId(fixedStudentId ?? "");
      setDays([]);
      setProductId("");
      setTouched(false);
    }
  }, [open, fixedClassId, fixedStudentId]);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId],
  );
  const operatingDays = useMemo(
    () => (selectedClass ? parseDays(selectedClass.days_of_week) : []),
    [selectedClass],
  );
  const matchedProduct = useMemo(
    () =>
      products.find(
        (p) => p.sessions_per_week != null && p.sessions_per_week === days.length,
      ) ?? null,
    [products, days.length],
  );

  // 자동 매칭 — 사용자가 수동 변경 안 했을 때만
  useEffect(() => {
    if (touched) return;
    if (matchedProduct && productId !== matchedProduct.id) {
      setProductId(matchedProduct.id);
    } else if (!matchedProduct && days.length === 0 && productId) {
      setProductId("");
    }
  }, [matchedProduct, touched, days.length, productId]);

  function onClassChange(v: string) {
    setClassId(v);
    const next = classes.find((c) => c.id === v);
    const op = parseDays(next?.days_of_week ?? null);
    setDays((prev) => prev.filter((d) => op.includes(d)));
  }
  function toggleDay(d: string) {
    setDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }
  const daysCsv = days
    .filter((d) => ALL_DAYS.includes(d))
    .sort((a, b) => ALL_DAYS.indexOf(a) - ALL_DAYS.indexOf(b))
    .join(",");

  const fixedClassName =
    fixedClassId && (classes.find((c) => c.id === fixedClassId)?.name ?? "");
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
          <div className="modal-backdrop">
            <form
              action={assignEnrollment}
              className="modal-card"
              style={{ maxWidth: 520 }}
            >
              <input type="hidden" name="back" value={backUrl} />
              <div className="panel-head" style={{ padding: "16px 20px 8px" }}>
                <p className="panel-title">수강 배정</p>
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
                  {fixedClassId ? (
                    <>
                      <input type="hidden" name="class_id" value={fixedClassId} />
                      <div className="field span-2">
                        <label>클래스</label>
                        <div
                          style={{
                            padding: "9px 12px",
                            background: "var(--bg)",
                            border: "1px solid var(--line)",
                            borderRadius: 8,
                            fontWeight: 700,
                          }}
                        >
                          {fixedClassName}
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
                  ) : (
                    <>
                      <input
                        type="hidden"
                        name="student_id"
                        value={fixedStudentId ?? ""}
                      />
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
                        <label>클래스 *</label>
                        <select
                          name="class_id"
                          value={classId}
                          onChange={(e) => onClassChange(e.target.value)}
                          required
                        >
                          <option value="">선택</option>
                          {classes.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  )}

                  <div className="field span-2">
                    <label>
                      참여 요일{" "}
                      {classId && (
                        <span className="muted" style={{ fontWeight: 400 }}>
                          ({days.length}회/주)
                        </span>
                      )}
                    </label>
                    <input type="hidden" name="attendance_days" value={daysCsv} />
                    {!classId ? (
                      <span className="muted" style={{ fontSize: 12 }}>
                        클래스를 먼저 선택하세요.
                      </span>
                    ) : operatingDays.length === 0 ? (
                      <span className="muted" style={{ fontSize: 12 }}>
                        이 클래스는 운영 요일이 설정되지 않았습니다.
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
                  </div>

                  <div className="field span-2">
                    <label>
                      수강료 상품{" "}
                      {productId && (() => {
                        const sel = products.find((p) => p.id === productId);
                        return sel?.price != null ? (
                          <span
                            style={{
                              fontWeight: 700,
                              color: "var(--brand)",
                              fontSize: 13,
                              marginLeft: 6,
                            }}
                          >
                            · {Number(sel.price).toLocaleString()}원/월
                          </span>
                        ) : null;
                      })()}
                    </label>
                    <select
                      name="product_id"
                      value={productId}
                      onChange={(e) => {
                        setProductId(e.target.value);
                        setTouched(true);
                      }}
                    >
                      <option value="">선택 안 함</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.sessions_per_week ? ` (주 ${p.sessions_per_week}회)` : ""}
                          {p.price != null ? ` · ${Number(p.price).toLocaleString()}원` : ""}
                        </option>
                      ))}
                    </select>
                    {!touched && matchedProduct && (
                      <span className="muted" style={{ fontSize: 12 }}>
                        주 {days.length}회 매칭 자동 선택: {matchedProduct.name}
                      </span>
                    )}
                    {!touched && !matchedProduct && days.length > 0 && (
                      <span
                        className="muted"
                        style={{ fontSize: 12, color: "var(--orange)" }}
                      >
                        ⚠ 주 {days.length}회 수강료 상품이 없습니다.
                      </span>
                    )}
                  </div>
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
