import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CheckRowToggle from "../CheckRowToggle";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import {
  setPaymentStatus,
  setInvoiceStatusInDetail,
  deleteInvoiceInDetail,
  seedDummyPayments,
} from "./actions";

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

type ListRow = {
  id: string;
  period: string;
  amount: number;
  status: string;
  paid_at: string | null;
  due_date: string | null;
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
  const supabase = await createClient();

  // 목록 쿼리 (상태 필터 적용)
  let listQuery = supabase
    .from("invoices")
    .select("id, period, amount, status, paid_at, due_date, students(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (s) listQuery = listQuery.eq("status", s);

  const [listRes, totalsRes, detailRes, paymentsRes, itemsRes] =
    await Promise.all([
      listQuery,
      supabase.from("invoices").select("status, amount"),
      inv
        ? supabase
            .from("invoices")
            .select(
              "id, period, amount, status, source, due_date, paid_at, issued_at, method, pg_tx_id, center_id, students(id, name)",
            )
            .eq("id", inv)
            .single()
        : Promise.resolve({ data: null }),
      inv
        ? supabase
            .from("payments")
            .select(
              "id, amount, status, provider, pg_tx_id, method, card_name, card_number_masked, installment_months, approval_no, receipt_url, failed_reason, paid_at, created_at",
            )
            .eq("invoice_id", inv)
            .order("created_at", { ascending: false })
        : Promise.resolve({ data: [] }),
      inv
        ? supabase
            .from("invoice_items")
            .select("id, label, amount")
            .eq("invoice_id", inv)
        : Promise.resolve({ data: [] }),
    ]);

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
    <>
      <div className="page-head">
        <div>
          <h1>결제 상태</h1>
          <p className="subtext">
            전체 청구·결제 내역 (입금 확인 후 수동 확정 또는 PortOne 결제 결과
            자동 반영). 행 클릭 → 우측 상세 (영수증·환불·결제이력).
          </p>
        </div>
        <div className="toolbar">
          <form action={seedDummyPayments}>
            <button
              className="btn"
              type="submit"
              title="결제완료인데 카드 정보 없는 청구서에 더미 영수증 정보 채워주기 (테스트 전용)"
            >
              더미 결제정보 채우기
            </button>
          </form>
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
        <div className="summary-card"><span>청구 대기</span><strong>{totals.waiting}</strong></div>
        <div className="summary-card"><span>결제완료</span><strong>{totals.paid}</strong></div>
        <div className="summary-card"><span>실패</span><strong>{totals.failed}</strong></div>
        <div className="summary-card"><span>환불</span><strong>{totals.refunded}</strong></div>
      </div>

      <div className="grid member-layout">
        <form action={setPaymentStatus} className="panel elevated">
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
              <button className="btn primary" name="status" value="결제완료" type="submit">
                선택 결제완료
              </button>
              <button className="btn warn" name="status" value="실패" type="submit">
                선택 실패
              </button>
              <button className="btn" name="status" value="환불" type="submit">
                선택 환불
              </button>
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
          <CheckRowToggle>
            <table>
              <thead>
                <tr>
                  <th className="check-cell"></th>
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
                    className={`row-link-host ${i.id === inv ? "selected" : ""}`}
                  >
                    <td className="check-cell">
                      <input type="checkbox" name="ids" value={i.id} />
                    </td>
                    <td>
                      <Link
                        href={`/admin/payment-status?inv=${i.id}${s ? `&s=${encodeURIComponent(s)}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 900, color: "var(--text)" }}
                      >
                        {i.students?.name ?? "-"}
                      </Link>
                    </td>
                    <td className="muted">{i.period}</td>
                    <td>{Number(i.amount).toLocaleString()}원</td>
                    <td>
                      <span className={`badge ${SB[i.status] ?? "gray"}`}>
                        {i.status}
                      </span>
                    </td>
                    <td className="muted">
                      {i.paid_at ? i.paid_at.slice(0, 10) : "-"}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={6}>
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
          </CheckRowToggle>
        </form>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">결제 상세 (영수증)</p>
            {detail && (
              <span className={`badge ${SB[detail.status] ?? "gray"}`}>
                {detail.status}
              </span>
            )}
          </div>
          <div className="panel-body">
            {!detail ? (
              <div className="empty-state">
                <strong>선택된 내역이 없습니다</strong>
                <p>왼쪽 목록에서 학생을 선택하면 결제 정보·영수증·환불 처리가 여기 나타납니다.</p>
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">청구 정보</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>학생</span>
                      <strong>
                        {detail.students?.id ? (
                          <Link
                            href={`/admin/students/${detail.students.id}`}
                            style={{ color: "var(--text)" }}
                          >
                            {detail.students.name ?? "-"} →
                          </Link>
                        ) : (
                          detail.students?.name ?? "-"
                        )}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>청구 기간</span>
                      <strong>{detail.period}</strong>
                    </div>
                    <div className="info-row">
                      <span>합계</span>
                      <strong>{fmtKRW(detail.amount)}</strong>
                    </div>
                    <div className="info-row">
                      <span>발생 출처</span>
                      <strong>{detail.source ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>납기일</span>
                      <strong>{detail.due_date ?? "-"}</strong>
                    </div>
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="detail-block">
                    <p className="detail-title">청구 항목</p>
                    <table className="member-table" style={{ marginTop: 0 }}>
                      <thead>
                        <tr>
                          <th>항목</th>
                          <th style={{ textAlign: "right" }}>금액</th>
                        </tr>
                      </thead>
                      <tbody>
                        {items.map((it) => (
                          <tr key={it.id}>
                            <td>{it.label}</td>
                            <td style={{ textAlign: "right" }}>
                              {fmtKRW(it.amount)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="detail-block">
                  <p className="detail-title">결제 정보</p>
                  {!successPayment ? (
                    <div
                      className="muted"
                      style={{ fontSize: 13 }}
                    >
                      아직 결제 정보가 없습니다.{" "}
                      <Link
                        href={`/admin/billing?ym=${detail.period}`}
                        style={{ color: "var(--brand)" }}
                      >
                        청구 관리에서 결제하기 →
                      </Link>
                      <div style={{ marginTop: 6, fontSize: 12 }}>
                        또는 수동 수납이면 아래 "결제완료 처리" 클릭.
                      </div>
                    </div>
                  ) : (
                    <div className="info-list">
                      <div className="info-row">
                        <span>결제수단</span>
                        <strong>
                          {successPayment.card_name ?? "카드"}
                          {successPayment.method ? ` (${successPayment.method})` : ""}
                        </strong>
                      </div>
                      {successPayment.card_number_masked && (
                        <div className="info-row">
                          <span>카드번호</span>
                          <strong style={{ fontFamily: "monospace" }}>
                            {successPayment.card_number_masked}
                          </strong>
                        </div>
                      )}
                      <div className="info-row">
                        <span>할부</span>
                        <strong>
                          {successPayment.installment_months
                            ? `${successPayment.installment_months}개월`
                            : "일시불"}
                        </strong>
                      </div>
                      {successPayment.approval_no && (
                        <div className="info-row">
                          <span>승인번호</span>
                          <strong style={{ fontFamily: "monospace" }}>
                            {successPayment.approval_no}
                          </strong>
                        </div>
                      )}
                      <div className="info-row">
                        <span>결제일시</span>
                        <strong>{fmtDateTime(successPayment.paid_at)}</strong>
                      </div>
                      <div className="info-row">
                        <span>결제대행</span>
                        <strong>
                          {successPayment.provider}
                          {successPayment.provider === "portone-dummy" && (
                            <span
                              className="badge gray"
                              style={{ marginLeft: 6, fontSize: 10 }}
                            >
                              더미
                            </span>
                          )}
                        </strong>
                      </div>
                      {successPayment.receipt_url &&
                        successPayment.provider !== "portone-dummy" && (
                          <div className="info-row">
                            <span>영수증</span>
                            <a
                              href={successPayment.receipt_url}
                              target="_blank"
                              rel="noreferrer"
                              style={{ color: "var(--brand)" }}
                            >
                              영수증 보기 ↗
                            </a>
                          </div>
                        )}
                    </div>
                  )}
                </div>

                <div className="detail-block">
                  <p className="detail-title">수동 상태 처리</p>
                  <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                    PG 미사용 수동 수납·환불용. PortOne 결제는 청구 관리에서 진행.
                  </p>
                  <div className="action-grid">
                    {["청구", "결제완료", "실패", "환불"].map((st) => {
                      const isDestructive = st === "환불";
                      const btn = (
                        <button
                          type="submit"
                          className={`btn${st === "결제완료" ? " primary" : st === "환불" ? " warn" : st === "실패" ? " danger" : ""}`}
                          style={{ width: "100%" }}
                          disabled={detail.status === st}
                        >
                          {st === "결제완료"
                            ? "결제완료 처리"
                            : st === "환불"
                              ? "환불 처리"
                              : st === "실패"
                                ? "실패 처리"
                                : "청구로 되돌리기"}
                        </button>
                      );
                      return (
                        <form
                          key={st}
                          action={setInvoiceStatusInDetail.bind(
                            null,
                            detail.id,
                            st,
                          )}
                        >
                          {isDestructive && detail.status !== st ? (
                            <ConfirmButton
                              message={`${detail.students?.name ?? "학생"} 의 ${detail.period} 결제를 환불 처리할까요?\n(PortOne 실제 환불 API 호출은 추후 — 현재는 상태만 변경)`}
                              className="btn warn"
                              type="submit"
                              style={{ width: "100%" }}
                            >
                              환불 처리
                            </ConfirmButton>
                          ) : (
                            btn
                          )}
                        </form>
                      );
                    })}
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">위험 영역</p>
                  <form action={deleteInvoiceInDetail.bind(null, detail.id)}>
                    <ConfirmButton
                      message={`'${detail.students?.name ?? "학생"}' 의 ${detail.period} 청구서를 삭제할까요?\n관련 결제 이력(payments)도 함께 삭제됩니다.`}
                      className="btn danger"
                      type="submit"
                      style={{ width: "100%" }}
                    >
                      청구서 삭제
                    </ConfirmButton>
                  </form>
                </div>

                {payments.length > 1 && (
                  <div className="detail-block">
                    <p className="detail-title">결제 이력 (재시도 포함)</p>
                    <table className="member-table" style={{ marginTop: 0 }}>
                      <thead>
                        <tr>
                          <th>일시</th>
                          <th>상태</th>
                          <th>금액</th>
                          <th>비고</th>
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map((p) => (
                          <tr key={p.id}>
                            <td className="muted">
                              {fmtDateTime(p.paid_at ?? p.created_at)}
                            </td>
                            <td>
                              <span className={`badge ${PSB[p.status] ?? "gray"}`}>
                                {p.status}
                              </span>
                            </td>
                            <td>{fmtKRW(p.amount)}</td>
                            <td className="muted" style={{ fontSize: 12 }}>
                              {p.failed_reason ??
                                (p.approval_no ? `승인 ${p.approval_no}` : "-")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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
