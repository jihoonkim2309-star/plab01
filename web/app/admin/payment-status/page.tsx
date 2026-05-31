import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ExportLink from "../ExportLink";
import { PaymentDrawerProvider } from "./PaymentDrawerContext";
import PaymentDetailDrawer from "./PaymentDetailDrawer";
import PaymentRowLink from "./PaymentRowLink";
import { seedDummyPayments } from "./actions";

const SB: Record<string, string> = {
  대기: "gray",
  청구: "orange",
  결제완료: "green",
  실패: "red",
  환불: "blue",
};
const PSB: Record<string, string> = {
  성공: "green",
  실패: "red",
  환불: "blue",
  대기: "gray",
};
const CHANNEL_LABELS: Record<string, string> = {
  parent_portal: "학부모앱 결제",
  pg_in_store: "온라인 카드 결제",
  offline_cash: "현금",
  offline_card: "단말기 카드",
  offline_transfer: "계좌이체",
};

type ListRow = {
  id: string;
  period: string;
  amount: number;
  status: string;
  paid_at: string | null;
  due_date: string | null;
  payment_method: string | null;
  students: { name: string } | null;
};

type InvoiceDetail = {
  id: string;
  period: string;
  amount: number;
  status: string;
  source: string;
  due_date: string | null;
  paid_at: string | null;
  issued_at: string | null;
  method: string | null;
  pg_tx_id: string | null;
  center_id: string;
  students: { id: string; name: string | null } | null;
};

type Payment = {
  id: string;
  amount: number;
  status: string;
  provider: string;
  pg_tx_id: string | null;
  method: string | null;
  card_name: string | null;
  card_number_masked: string | null;
  installment_months: number | null;
  approval_no: string | null;
  receipt_url: string | null;
  failed_reason: string | null;
  paid_at: string | null;
  created_at: string;
};

type Item = { id: string; label: string; amount: number };

function fmtKRW(n: number | null | undefined) {
  return `${Number(n ?? 0).toLocaleString()}원`;
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 16).replace("T", " ");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{
    s?: string;
    q?: string;
    inv?: string;
    seeded?: string;
    seed_error?: string;
  }>;
}) {
  const { s, q, inv, seeded, seed_error } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 목록 쿼리 (상태 필터 적용)
  let listQuery = supabase
    .from("invoices")
    .select("id, period, amount, status, paid_at, due_date, payment_method, students(name)")
    .eq("center_id", cid)
    .order("created_at", { ascending: false })
    .limit(300);
  if (s) listQuery = listQuery.eq("status", s);

  const [listRes, totalsRes, detailRes, paymentsRes, itemsRes, centerRes] =
    await Promise.all([
      listQuery,
      supabase.from("invoices").select("status, amount").eq("center_id", cid),
      inv
        ? supabase
            .from("invoices")
            .select(
              "id, period, amount, status, source, due_date, paid_at, issued_at, method, pg_tx_id, center_id, students(id, name)",
            )
            .eq("center_id", cid)
            .eq("id", inv)
            .single()
        : Promise.resolve({ data: null }),
      inv
        ? supabase
            .from("payments")
            .select(
              "id, amount, status, provider, pg_tx_id, method, card_name, card_number_masked, installment_months, approval_no, receipt_url, failed_reason, paid_at, created_at",
            )
            .eq("center_id", cid)
            .eq("invoice_id", inv)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      inv
        ? supabase
            .from("invoice_items")
            .select("id, label, amount")
            .eq("center_id", cid)
            .eq("invoice_id", inv)
        : Promise.resolve({ data: [] }),
      // 영수증 헤더에 표시할 활성 센터 정보
      supabase
        .from("centers")
        .select("name, address, contact_phone")
        .eq("id", cid)
        .single(),
    ]);
  const center = (centerRes.data ?? null) as unknown as {
    name: string | null;
    address: string | null;
    contact_phone: string | null;
  } | null;

  let rawList = (listRes.data ?? []) as unknown as ListRow[];
  if (q) {
    const needle = q.toLowerCase();
    rawList = rawList.filter((i) => {
      const n = (i.students?.name ?? "").toLowerCase();
      const p = (i.period ?? "").toLowerCase();
      return n.includes(needle) || p.includes(needle);
    });
  }
  const list = rawList;

  const allRows = (totalsRes.data ?? []) as { status: string; amount: number }[];
  const totals = {
    total: allRows.length,
    waiting: allRows.filter((r) => r.status === "청구").length,
    paid: allRows.filter((r) => r.status === "결제완료").length,
    failed: allRows.filter((r) => r.status === "실패").length,
    refunded: allRows.filter((r) => r.status === "환불").length,
  };

  const detail = (detailRes.data ?? null) as unknown as InvoiceDetail | null;
  const payments = ((paymentsRes.data ?? []) as unknown) as Payment[];
  const items = ((itemsRes.data ?? []) as unknown) as Item[];
  const successPayment = payments.find((p) => p.status === "성공");
  const hasFilter = !!(s || q);

  return (
    <PaymentDrawerProvider>
      <div className="page-head">
        <div>
          <h1>결제 상태</h1>
          <p className="subtext">청구·결제 내역 조회 + 영수증·환불·결제 이력</p>
        </div>
        <div className="toolbar">
          {process.env.NODE_ENV !== "production" && (
            <form action={seedDummyPayments}>
              <button
                className="btn"
                type="submit"
                title="결제완료인데 카드 정보 없는 청구서에 더미 영수증 정보 채워주기 (테스트 전용 — 운영 환경에서 자동 숨김)"
              >
                더미 결제정보 채우기 (dev)
              </button>
            </form>
          )}
        </div>
      </div>

      {seeded && (
        <div
          className="panel"
          style={{
            background: "var(--blue-soft)",
            borderColor: "#b8d0ee",
            color: "var(--blue)",
            padding: "12px 16px",
          }}
        >
          더미 결제정보 {seeded}건 채움. 행을 클릭해 우측 상세에서 카드 정보 확인하세요.
        </div>
      )}

      {seed_error && (
        <div
          className="panel"
          style={{
            background: "var(--red-soft)",
            borderColor: "#f0bdbd",
            color: "var(--red)",
            padding: "12px 16px",
          }}
        >
          <strong>더미 시드 실패</strong>
          <div style={{ marginTop: 4 }}>{seed_error}</div>
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>미결제</span><strong>{totals.waiting + totals.failed}</strong></div>
        <div className="summary-card"><span>결제완료</span><strong>{totals.paid}</strong></div>
        <div className="summary-card"><span>실패</span><strong>{totals.failed}</strong></div>
        <div className="summary-card"><span>환불</span><strong>{totals.refunded}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              내역{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                  : `${list.length}건`}
              </span>
            </p>
            <div className="toolbar">
              <ExportLink
                href={`/api/admin/export/payment-status?${(() => {
                  const p = new URLSearchParams();
                  if (s) p.set("s", s);
                  if (q) p.set("q", q);
                  return p.toString();
                })()}`}
              />
            </div>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="s"
                current={s}
                options={[
                  { value: "청구", label: "청구" },
                  { value: "결제완료", label: "결제완료" },
                  { value: "실패", label: "실패" },
                  { value: "환불", label: "환불" },
                  { value: "대기", label: "대기" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생·청구월 검색" />
              {hasFilter && (
                <Link className="btn" href="/admin/payment-status">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <div className="list-scroll">
            <table>
              <thead>
                <tr>
                  <th>학생</th>
                  <th>청구월</th>
                  <th>금액</th>
                  <th>상태</th>
                  <th>결제일</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr
                    key={i.id}
                    className="row-link-host"
                  >
                    <td>
                      <PaymentRowLink
                        invoiceId={i.id}
                        href={`/admin/payment-status?inv=${i.id}${s ? `&s=${encodeURIComponent(s)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 900, color: "var(--text)" }}
                      >
                        {i.students?.name ?? "-"}
                      </PaymentRowLink>
                    </td>
                    <td className="muted">{i.period}</td>
                    <td>{Number(i.amount).toLocaleString()}원</td>
                    <td>
                      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                        <span className={`badge ${SB[i.status] ?? "gray"}`}>
                          {i.status}
                        </span>
                        {i.status === "결제완료" && (
                          <span className="badge gray" title="결제 채널">
                            {i.payment_method
                              ? (CHANNEL_LABELS[i.payment_method] ?? i.payment_method)
                              : "수동"}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="muted">
                      {i.paid_at ? i.paid_at.slice(0, 10) : "-"}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={5}>
                      <div className="empty-state">
                        {hasFilter ? (
                          <>
                            <strong>검색 결과가 없습니다</strong>
                            <p>필터·검색어를 조정해 보세요.</p>
                          </>
                        ) : (
                          <>
                            <strong>내역이 없습니다</strong>
                            <p>
                              <Link href="/admin/billing">청구 관리</Link>에서
                              청구서를 생성하면 여기 표시됩니다.
                            </p>
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

        <PaymentDetailDrawer />
      </div>
    </PaymentDrawerProvider>
  );
}
