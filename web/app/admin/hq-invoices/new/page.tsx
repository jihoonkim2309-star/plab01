import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "../../BackLink";
import { createHqInvoice } from "../actions";

const pad = (n: number) => String(n).padStart(2, "0");

export default async function HqInvoiceNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "super_admin") {
    return (
      <div className="page-head">
        <h1>접근 불가</h1>
        <p className="subtext">슈퍼 어드민만 청구서를 발행할 수 있습니다.</p>
      </div>
    );
  }

  const { data: centers } = await supabase
    .from("centers")
    .select("id, name, subscription_plan, subscription_base_fee, subscription_per_student, hq_billing_day")
    .order("name");

  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/hq-invoices" label="청구 목록" />
          <h1>청구서 발행</h1>
          <p className="subtext">지점·기간 선택 시 지점의 사용료 정책 + 활성 학생수로 자동 계산</p>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ background: "var(--red-soft, #fdecec)", borderColor: "#f3b1b1", color: "var(--red)", padding: "12px 16px" }}>
          {error}
        </div>
      )}

      <form action={createHqInvoice} className="panel">
        <div className="panel-head">
          <p className="panel-title">청구서 발행</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>지점 *</label>
              <select name="center_id" required defaultValue="">
                <option value="" disabled>지점 선택</option>
                {(centers ?? []).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} — {c.subscription_plan ?? "정액"}
                    {c.subscription_plan === "정액" ? ` (${(c.subscription_base_fee ?? 0).toLocaleString()}원)` : ""}
                    {c.subscription_plan === "학생수" ? ` (학생당 ${(c.subscription_per_student ?? 0).toLocaleString()}원)` : ""}
                    {c.subscription_plan === "혼합" ? ` (기본 ${(c.subscription_base_fee ?? 0).toLocaleString()} + 학생당 ${(c.subscription_per_student ?? 0).toLocaleString()})` : ""}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>청구 기간 (YYYY-MM) *</label>
              <input name="period" placeholder="2026-05" defaultValue={defaultPeriod} pattern="\d{4}-\d{2}" required />
            </div>
          </div>
          <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
            💡 발행 시 해당 지점의 활성 학생수가 자동 집계되어 요금 정책에 따라 금액이 계산됩니다.
            납기일은 지점의 “본사 청구일” 로 자동 설정됩니다.
          </p>
          <div className="detail-actions">
            <Link className="btn" href="/admin/hq-invoices">취소</Link>
            <button className="btn primary" type="submit">청구서 발행</button>
          </div>
        </div>
      </form>
    </>
  );
}
