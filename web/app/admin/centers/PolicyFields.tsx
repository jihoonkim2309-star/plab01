"use client";

// 본사 사용료 정책 입력 필드.
// 요금 체계(정액/학생수/매출비례) 선택에 따라 해당 input 만 표시.
// 숨겨진 input 은 display:none 으로 form data 에는 남음 (체계를 다시 바꿔도 값 유지).

import { useState } from "react";

type Defaults = {
  plan?: string | null;
  base_fee?: number | null;
  per_student?: number | null;
  revenue_pct?: number | null;
  hq_billing_day?: number | null;
};

export default function PolicyFields({ defaults }: { defaults: Defaults }) {
  const [plan, setPlan] = useState(defaults.plan ?? "정액");
  const showBase = plan === "정액";
  const showPerStudent = plan === "학생수";
  const showRevenuePct = plan === "매출비례";

  return (
    <>
      <div className="field">
        <label>요금 체계 *</label>
        <select
          name="subscription_plan"
          value={plan}
          onChange={(e) => setPlan(e.target.value)}
          required
        >
          <option value="정액">정액 (월 고정)</option>
          <option value="학생수">학생수 (학생당 N원)</option>
          <option value="매출비례">매출비례 (전월 매출의 N%)</option>
        </select>
      </div>
      <div className="field">
        <label>본사 청구일 (매월 N일) *</label>
        <input
          name="hq_billing_day"
          type="number"
          min={1}
          max={28}
          defaultValue={defaults.hq_billing_day ?? 1}
          required
        />
      </div>

      <div className="field" style={{ display: showBase ? undefined : "none" }}>
        <label>정액 기본료 (원) *</label>
        <input
          name="subscription_base_fee"
          type="number"
          min={0}
          step={10000}
          defaultValue={defaults.base_fee ?? 0}
          required={showBase}
        />
      </div>
      <div className="field" style={{ display: showPerStudent ? undefined : "none" }}>
        <label>학생당 추가료 (원) *</label>
        <input
          name="subscription_per_student"
          type="number"
          min={0}
          step={100}
          defaultValue={defaults.per_student ?? 0}
          required={showPerStudent}
        />
      </div>
      <div className="field" style={{ display: showRevenuePct ? undefined : "none" }}>
        <label>매출비례 % (전월 매출 기준) *</label>
        <input
          name="subscription_revenue_pct"
          type="number"
          min={0}
          max={100}
          step={0.1}
          defaultValue={defaults.revenue_pct ?? 0}
          required={showRevenuePct}
        />
      </div>
    </>
  );
}
