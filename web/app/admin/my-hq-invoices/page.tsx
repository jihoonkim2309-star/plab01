import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";

const STATUS_BADGE: Record<string, string> = {
  청구: "blue",
  결제완료: "green",
  미납: "red",
  면제: "gray",
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString()}원`;

export default async function MyHqInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; invoice?: string }>;
}) {
  const { status, invoice: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("hq_invoices")
    .select("id, period, plan, total, student_count, status, due_date, paid_at")
    .eq("center_id", cid)
    .order("period", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, allRes, selectedRes] = await Promise.all([
    listQuery,
    supabase.from("hq_invoices").select("status, total").eq("center_id", cid),
    selectedId
      ? supabase
          .from("hq_invoices")
          .select(
            "id, period, plan, base_fee, per_student_fee, student_count, revenue_base, revenue_pct, total, status, due_date, issued_at, paid_at, method, memo",
          )
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  type Row = {
    id: string;
    period: string;
    plan: string;
    total: number;
    student_count: number;
    status: string;
    due_date: string | null;
    paid_at: string | null;
  };
  const list = (listRes.data ?? []) as Row[];
  const all = (allRes.data ?? []) as { status: string; total: number }[];
  const totals = {
    total: all.length,
    billed: all.filter((r) => r.status === "청구").length,
    paid: all.filter((r) => r.status === "결제완료").length,
    overdue: all.filter((r) => r.status === "미납").length,
    outstandingAmount: all
      .filter((r) => r.status === "청구" || r.status === "미납")
      .reduce((a, b) => a + Number(b.total ?? 0), 0),
  };
  const selected = selectedRes.data;
  const hasFilter = !!status;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>본사 청구서</h1>
          <p className="subtext">우리 지점에 발행된 본사 사용료 청구 내역 (열람 전용)</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>청구 중</span><strong>{totals.billed}</strong></div>
        <div className="summary-card"><span>결제완료</span><strong>{totals.paid}</strong></div>
        <div className="summary-card"><span>미납</span><strong>{totals.overdue}</strong></div>
        <div className="summary-card"><span>미수금</span><strong>{fmt(totals.outstandingAmount)}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              청구서 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}건 / 전체 ${totals.total}` : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "청구", label: "청구" },
                  { value: "결제완료", label: "결제완료" },
                  { value: "미납", label: "미납" },
                  { value: "면제", label: "면제" },
                ]}
              />
              <div style={{ flex: 1 }} />
              {hasFilter && <Link className="btn" href="/admin/my-hq-invoices">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>기간</th>
                <th>학생수</th>
                <th>금액</th>
                <th>납기</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={`row-link-host ${r.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/my-hq-invoices?invoice=${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {r.period}
                    </Link>
                  </td>
                  <td className="muted">{r.student_count}명</td>
                  <td><strong>{fmt(r.total)}</strong></td>
                  <td className="muted">{r.due_date ?? "-"}</td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] ?? "gray"}`}>{r.status}</span></td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <strong>발행된 청구서가 없습니다</strong>
                      <p>본사가 발행하면 여기에 표시됩니다. 매월 지정된 청구일에 자동 발행됩니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">청구서 상세</p>
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 청구서가 없습니다</strong>
                <p>왼쪽 목록에서 청구서를 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.period}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">청구 내역</p>
                  <div className="info-list">
                    <div className="info-row"><span>요금 체계</span><strong>{selected.plan}</strong></div>
                    {selected.plan === "정액" && (
                      <div className="info-row"><span>정액 기본료</span><strong>{fmt(selected.base_fee)}</strong></div>
                    )}
                    {selected.plan === "학생수" && (
                      <>
                        <div className="info-row"><span>학생당 이용요금</span><strong>{fmt(selected.per_student_fee)}</strong></div>
                        <div className="info-row"><span>학생수 (발행 시점)</span><strong>{selected.student_count}명</strong></div>
                      </>
                    )}
                    {selected.plan === "매출비례" && (
                      <>
                        <div className="info-row"><span>전월 매출 베이스</span><strong>{fmt(selected.revenue_base)}</strong></div>
                        <div className="info-row"><span>적용 %</span><strong>{selected.revenue_pct}%</strong></div>
                      </>
                    )}
                    <div className="info-row"><span>총 금액</span><strong style={{ color: "var(--brand)", fontSize: 16 }}>{fmt(selected.total)}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">발행/수납</p>
                  <div className="info-list">
                    <div className="info-row"><span>발행일</span><strong>{selected.issued_at?.slice(0, 10) ?? "-"}</strong></div>
                    <div className="info-row"><span>납기</span><strong>{selected.due_date ?? "-"}</strong></div>
                    <div className="info-row"><span>결제일</span><strong>{selected.paid_at?.slice(0, 10) ?? "-"}</strong></div>
                    <div className="info-row"><span>결제 방법</span><strong>{selected.method ?? "-"}</strong></div>
                    <div className="info-row"><span>메모</span><strong>{selected.memo ?? "-"}</strong></div>
                  </div>
                </div>

                {selected.status !== "결제완료" && (
                  <div className="approval-note">
                    💡 결제 후 본사가 결제완료로 처리합니다. 입금자명·승인번호 등 식별 정보는 본사로 별도 전달해 주세요.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
