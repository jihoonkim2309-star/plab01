"use client";

import { useEffect, useMemo, useState } from "react";

// 클래스 select + 참여 요일 체크박스 + 수강료 상품 통합 (학생당 단일 클래스 가정).
// - 클래스 변경 시 그 클래스의 운영 요일만 노출
// - 체크된 요일 수가 변하면 상품 select 가 sessions_per_week 일치 상품을 자동 추천
// - 사용자가 수동 변경하면 그 선택 유지 (자동 덮어쓰기 안 함)

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

function parseDays(csv: string | null): string[] {
  if (!csv) return [];
  return csv.split(",").map((s) => s.trim()).filter(Boolean);
}

export default function AttendanceDaysPicker({
  classes,
  products,
  defaultClassId,
  defaultAttendanceDays,
  defaultProductId,
}: {
  classes: ClassOption[];
  products: ProductOption[];
  defaultClassId: string | null;
  defaultAttendanceDays: string | null;
  defaultProductId: string | null;
}) {
  const [classId, setClassId] = useState(defaultClassId ?? "");
  const [days, setDays] = useState<string[]>(parseDays(defaultAttendanceDays));
  const [productId, setProductId] = useState(defaultProductId ?? "");
  // 사용자가 product 를 수동 변경했는지 추적 — 자동 추천 덮어쓰기 방지
  const [touched, setTouched] = useState(!!defaultProductId);

  const selectedClass = useMemo(
    () => classes.find((c) => c.id === classId) ?? null,
    [classes, classId],
  );
  const operatingDays = useMemo(
    () => (selectedClass ? parseDays(selectedClass.days_of_week) : []),
    [selectedClass],
  );

  // 회수별 매칭 상품 추천
  const matchedProduct = useMemo(
    () =>
      products.find(
        (p) => p.sessions_per_week != null && p.sessions_per_week === days.length,
      ) ?? null,
    [products, days.length],
  );

  // 사용자가 수동 선택 안 했으면 매칭 상품으로 자동 갱신.
  // 매칭 없음 + 이전 productId 가 남아 있으면 → 클리어 (mismatch 잔존 방지).
  useEffect(() => {
    if (touched) return;
    if (matchedProduct && productId !== matchedProduct.id) {
      setProductId(matchedProduct.id);
    } else if (!matchedProduct && productId) {
      setProductId("");
    }
  }, [matchedProduct, touched, productId]);

  function onClassChange(newId: string) {
    setClassId(newId);
    const newClass = classes.find((c) => c.id === newId);
    const newOperating = parseDays(newClass?.days_of_week ?? null);
    // 사용자가 자녀의 실제 출석 요일을 명시적으로 선택해야 한다.
    // 이전 days 중 새 클래스의 운영 요일에 포함된 것만 유지, 나머지는 제거.
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

  // 현재 선택된 상품 정보 (mismatch 안내용)
  const selectedProduct = useMemo(
    () => products.find((p) => p.id === productId) ?? null,
    [products, productId],
  );
  // 회수 mismatch — 선택된 상품의 sessions_per_week 와 현재 참여 요일 수가 안 맞으면 경고.
  // touched 여부 무관 (자동 추천이 따라잡지 못한 케이스 = 해당 회수 상품 자체가 없는 경우도 cover).
  const productMismatch =
    !!productId &&
    !!selectedProduct &&
    selectedProduct.sessions_per_week != null &&
    selectedProduct.sessions_per_week !== days.length;

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
        <label>
          참여 요일{" "}
          {classId && operatingDays.length > 0 && (
            <span className="muted" style={{ fontWeight: 400 }}>
              ({days.length}회/주) — 자녀가 참여하는 요일을 클릭해 선택
            </span>
          )}
        </label>
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

      <div className="field">
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
        {products.length === 0 && (
          <span className="muted" style={{ fontSize: 12 }}>
            등록된 수강료 상품이 없습니다 — "수업 운영 → 수강료 상품"에서 먼저 생성하세요.
          </span>
        )}
        {!touched && matchedProduct && (
          <span className="muted" style={{ fontSize: 12 }}>
            주 {days.length}회 매칭 자동 선택: {matchedProduct.name}
          </span>
        )}
        {!touched && !matchedProduct && days.length > 0 && (
          <span className="muted" style={{ fontSize: 12, color: "var(--orange)" }}>
            ⚠ 주 {days.length}회 수강료 상품이 없습니다 — "수업 운영 → 수강료 상품"에서 추가하세요.
          </span>
        )}
        {productMismatch && (
          <span className="muted" style={{ fontSize: 12, color: "var(--orange)" }}>
            ⚠ 참여 요일은 주 {days.length}회 인데 선택된 상품은 주 {selectedProduct?.sessions_per_week}회 입니다.
          </span>
        )}
      </div>
    </>
  );
}
