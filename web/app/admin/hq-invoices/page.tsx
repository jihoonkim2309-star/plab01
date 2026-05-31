import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import ConfirmButton from "../ConfirmButton";
import { markPaid, setStatus, deleteHqInvoice } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  청구: "blue",
  결제완료: "green",
  미납: "red",
  면제: "gray",
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString()}원`;

export default async function HqInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; center_id?: string; period?: string; invoice?: string; saved?: string }>;
}) {
  const { status, center_id, period, invoice: selectedId, saved } = await searchParams;
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
        <p className="subtext">슈퍼 어드민만 본사 청구를 관리할 수 있습니다.</p>
      </div>
    );
  }

  let listQuery = supabase
    .from("hq_invoices")
    .select("id, center_id, period, plan, total, student_count, status, due_date, paid_at, centers(name)")
    .order("period", { ascending: false })
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (center_id) listQuery = listQuery.eq("center_id", center_id);
  if (period) listQuery = listQuery.eq("period", period);

  const [listRes, centersRes, allRes, selectedRes] = await Promise.all([
    listQuery,
    supabase.from("centers").select("id, name").order("name"),
    supabase.from("hq_invoices").select("status, total"),
    selectedId
      ? supabase
          .from("hq_invoices")
          .select("id, center_id, period, plan, base_fee, per_student_fee, student_count, revenue_base, revenue_pct, total, status, due_date, issued_at, paid_at, method, memo, centers(name, contact_phone, business_no)")
          .eq("id", selectedId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  type Row = {
    id: string;
    center_id: string;
    period: string;
    plan: string;
    total: number;
    student_count: number;
    status: string;
    due_date: string | null;
    paid_at: string | null;
    centers: { name: string } | null;
  };
  const list = (listRes.data ?? []) as unknown as Row[];
  const centers = centersRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string; total: number }[];
  const totals = {
    total: all.length,
    billed: all.filter((r) => r.status === "청구").length,
    paid: all.filter((r) => r.status === "결제완료").length,
    overdue: all.filter((r) => r.status === "미납").length,
    paidAmount: all.filter((r) => r.status === "결제완료").reduce((a, b) => a + Number(b.total ?? 0), 0),
    outstandingAmount: all.filter((r) => r.status === "청구" || r.status === "미납").reduce((a, b) => a + Number(b.total ?? 0), 0),
  };
  const selected = selectedRes.data as unknown as {
    id: string;
    center_id: string;
    period: string;
    plan: string;
    base_fee: number;
    per_student_fee: number;
    student_count: number;
    revenue_base: number;
    revenue_pct: number;
    total: number;
    status: string;
    due_date: string | null;
    issued_at: string;
    paid_at: string | null;
    method: string | null;
    memo: string | null;
    centers: { name: string; contact_phone: string | null; business_no: string | null } | null;
  } | null;
  const hasFilter = !!(status || center_id || period);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>본사 청구 관리</h1>
          <p className="subtext">지점 사용료 청구서 발행·수납·미납 관리</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/hq-invoices/new">청구서 발행</Link>
        </div>
      </div>

      {saved && (
        <div className="panel" style={{ background: "var(--green-soft)", borderColor: "#b8dccb", color: "var(--green)", padding: "12px 16px" }}>
          저장되었습니다.
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>전체 청구</span><strong>{totals.total}</strong></div>
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
              <FilterSelect
                param="center_id"
                current={center_id}
                placeholder="지점 전체"
                ariaLabel="지점 필터"
                options={centers.map((c) => ({ value: c.id, label: c.name }))}
              />
              <div style={{ flex: 1 }} />
              {hasFilter && <Link className="btn" href="/admin/hq-invoices">초기화</Link>}
            </FilterBar>
          </div>
          <div className="list-scroll">
          <table className="member-table">
            <thead>
              <tr>
                <th>기간</th>
                <th>지점</th>
                <th>학생수</th>
                <th>금액</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={`row-link-host ${r.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/hq-invoices?invoice=${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {r.period}
                    </Link>
                  </td>
                  <td className="muted">{r.centers?.name ?? "-"}</td>
                  <td className="muted">{r.student_count}명</td>
                  <td><strong>{fmt(r.total)}</strong></td>
                  <td><span className={`badge ${STATUS_BADGE[r.status] ?? "gray"}`}>{r.status}</span></td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>발행된 청구서가 없습니다</strong>
                          <p>우측 상단 “청구서 발행”으로 지점·기간 선택 시 자동 계산됩니다.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">청구서 상세</p>
            {selected && (
              <div className="toolbar">
                {selected.status !== "결제완료" && (
                  <form action={setStatus.bind(null, selected.id, "미납")}>
                    <button className="btn warn" type="submit">미납 처리</button>
                  </form>
                )}
                <form action={deleteHqInvoice.bind(null, selected.id)}>
                  <ConfirmButton
                    message={`${selected.period} 청구서를 삭제할까요?`}
                    className="btn danger"
                    type="submit"
                  >
                    삭제
                  </ConfirmButton>
                </form>
              </div>
            )}
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
                    <div className="muted" style={{ marginTop: 4 }}>{selected.centers?.name ?? "-"}</div>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">청구 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>지점</span><strong>{selected.centers?.name ?? "-"}</strong></div>
                    <div className="info-row"><span>사업자등록번호</span><strong>{selected.centers?.business_no ?? "-"}</strong></div>
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
                  <div className="detail-block">
                    <p className="detail-title">결제 완료 처리</p>
                    <form action={markPaid.bind(null, selected.id)}>
                      <div className="form-grid">
                        <div className="field">
                          <label>결제 방법</label>
                          <select name="method" defaultValue="계좌이체">
                            <option value="계좌이체">계좌이체</option>
                            <option value="카드">카드</option>
                            <option value="자동이체">자동이체</option>
                          </select>
                        </div>
                        <div className="field">
                          <label>메모</label>
                          <input name="memo" placeholder="예: 입금자명·승인번호" />
                        </div>
                      </div>
                      <div className="detail-actions">
                        <button className="btn primary" type="submit">결제완료로 처리</button>
                      </div>
                    </form>
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
