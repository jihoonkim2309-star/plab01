import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import BackLink from "../../BackLink";
import { createHqInvoice } from "../actions";

const pad = (n: number) => String(n).padStart(2, "0");
const fmt = (n: number) => `${(n ?? 0).toLocaleString()}원`;

function prevPeriod(period: string): string {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function calcTotal(
  plan: string,
  baseFee: number,
  perStudent: number,
  studentCount: number,
  revenueBase: number,
  revenuePct: number,
) {
  if (plan === "정액") return baseFee;
  if (plan === "학생수") return perStudent * studentCount;
  if (plan === "매출비례") return Math.round((revenueBase * revenuePct) / 100);
  return baseFee + perStudent * studentCount;
}

const PLAN_BADGE: Record<string, string> = {
  정액: "blue",
  학생수: "orange",
  매출비례: "brand",
};

export default async function HqInvoiceNewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; period?: string }>;
}) {
  const { error, period: paramPeriod } = await searchParams;
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

  const now = new Date();
  const defaultPeriod = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const period =
    paramPeriod && /^\d{4}-\d{2}$/.test(paramPeriod) ? paramPeriod : defaultPeriod;
  const prevPer = prevPeriod(period);

  const [centersRes, studentsRes, existingRes, prevInvRes] = await Promise.all([
    supabase
      .from("centers")
      .select("id, name, subscription_plan, subscription_base_fee, subscription_per_student, subscription_revenue_pct, hq_billing_day"),
    supabase.from("students").select("center_id, status"),
    supabase.from("hq_invoices").select("center_id, period").eq("period", period),
    supabase.from("invoices").select("center_id, amount, status").eq("period", prevPer).eq("status", "결제완료"),
  ]);

  const studentCountByCenter = new Map<string, number>();
  for (const s of studentsRes.data ?? []) {
    if (s.status === "정상" && s.center_id)
      studentCountByCenter.set(s.center_id, (studentCountByCenter.get(s.center_id) ?? 0) + 1);
  }
  const revenueByCenter = new Map<string, number>();
  for (const r of prevInvRes.data ?? []) {
    if (r.center_id)
      revenueByCenter.set(r.center_id, (revenueByCenter.get(r.center_id) ?? 0) + Number(r.amount ?? 0));
  }
  const alreadyIssued = new Set((existingRes.data ?? []).map((r) => r.center_id));

  const centers = (centersRes.data ?? []).map((c) => {
    const sc = studentCountByCenter.get(c.id) ?? 0;
    const rev = revenueByCenter.get(c.id) ?? 0;
    const plan = c.subscription_plan ?? "정액";
    const baseFee = Number(c.subscription_base_fee ?? 0);
    const perStudent = Number(c.subscription_per_student ?? 0);
    const revPct = Number(c.subscription_revenue_pct ?? 0);
    return {
      id: c.id,
      name: c.name,
      plan,
      baseFee,
      perStudent,
      revPct,
      hqBillingDay: c.hq_billing_day ?? 1,
      studentCount: sc,
      revenueBase: rev,
      total: calcTotal(plan, baseFee, perStudent, sc, rev, revPct),
      issued: alreadyIssued.has(c.id),
    };
  });

  return (
    <>
      <div className="page-head">
        <div>
          <BackLink href="/admin/hq-invoices" label="청구 목록" />
          <h1>청구서 발행</h1>
          <p className="subtext">기간 선택 시 지점별 정책으로 청구액 자동 계산</p>
        </div>
      </div>

      {error && (
        <div className="panel" style={{ background: "var(--red-soft, #fdecec)", borderColor: "#f3b1b1", color: "var(--red)", padding: "12px 16px" }}>
          {error}
        </div>
      )}

      <form className="panel">
        <div className="panel-body" style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <div className="field" style={{ maxWidth: 200 }}>
            <label>청구 기간 (YYYY-MM) *</label>
            <input
              name="period"
              defaultValue={period}
              pattern="\d{4}-\d{2}"
              required
            />
          </div>
          <button className="btn" type="submit">기간 적용</button>
          <p className="muted" style={{ fontSize: 12, marginLeft: 8 }}>
            기간 변경 후 [기간 적용] 누르면 미리보기가 갱신됩니다.
          </p>
        </div>
      </form>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
          gap: 12,
        }}
      >
        {centers.length === 0 && (
          <div className="panel" style={{ padding: 24 }}>
            <div className="empty-state">
              <strong>지점이 없습니다</strong>
              <p>지점 관리에서 지점을 먼저 등록하세요.</p>
            </div>
          </div>
        )}
        {centers.map((c) => (
          <div key={c.id} className="panel elevated" style={{ padding: 16, display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <strong style={{ fontSize: 16 }}>{c.name}</strong>
                <div style={{ marginTop: 4 }}>
                  <span className={`badge ${PLAN_BADGE[c.plan] ?? "gray"}`}>{c.plan}</span>
                  {c.issued && (
                    <span className="badge green" style={{ marginLeft: 6 }}>이미 발행</span>
                  )}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>예상 금액</div>
                <div style={{ fontSize: 18, fontWeight: 900, color: "var(--brand)" }}>
                  {fmt(c.total)}
                </div>
              </div>
            </div>
            <div className="info-list" style={{ fontSize: 12 }}>
              {c.plan === "정액" && (
                <div className="info-row"><span>정액 기본료</span><strong>{fmt(c.baseFee)}</strong></div>
              )}
              {c.plan === "학생수" && (
                <>
                  <div className="info-row"><span>활성 학생</span><strong>{c.studentCount}명</strong></div>
                  <div className="info-row">
                    <span>이용요금 × 명</span>
                    <strong>{fmt(c.perStudent)} × {c.studentCount} = {fmt(c.perStudent * c.studentCount)}</strong>
                  </div>
                </>
              )}
              {c.plan === "매출비례" && (
                <>
                  <div className="info-row"><span>전월({prevPer}) 매출</span><strong>{fmt(c.revenueBase)}</strong></div>
                  <div className="info-row">
                    <span>매출 × %</span>
                    <strong>{fmt(c.revenueBase)} × {c.revPct}% = {fmt(Math.round(c.revenueBase * c.revPct / 100))}</strong>
                  </div>
                </>
              )}
              <div className="info-row"><span>납기</span><strong>{period}-{pad(Math.min(c.hqBillingDay, 28))}</strong></div>
            </div>
            <form action={createHqInvoice}>
              <input type="hidden" name="center_id" value={c.id} />
              <input type="hidden" name="period" value={period} />
              <button
                className="btn primary"
                type="submit"
                disabled={c.issued}
                style={{ width: "100%" }}
              >
                {c.issued ? "이미 발행됨" : "이 지점 발행"}
              </button>
            </form>
          </div>
        ))}
      </div>
    </>
  );
}
