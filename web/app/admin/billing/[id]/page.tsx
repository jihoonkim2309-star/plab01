import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCenterPg } from "@/lib/portone";
import ConfirmButton from "../../ConfirmButton";
import PayButton from "../PayButton";
import {
  setInvoiceStatusDetail,
  deleteInvoiceDetail,
} from "../actions";

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

type Invoice = {
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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [invRes, paymentsRes, itemsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, period, amount, status, source, due_date, paid_at, issued_at, method, pg_tx_id, center_id, students(id, name)",
      )
      .eq("id", id)
      .single(),
    supabase
      .from("payments")
      .select(
        "id, amount, status, provider, pg_tx_id, method, card_name, card_number_masked, installment_months, approval_no, receipt_url, failed_reason, paid_at, created_at",
      )
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
    supabase
      .from("invoice_items")
      .select("id, label, amount")
      .eq("invoice_id", id),
  ]);

  const inv = invRes.data as unknown as Invoice | null;
  if (!inv) notFound();
  const payments = (paymentsRes.data ?? []) as unknown as Payment[];
  const items = (itemsRes.data ?? []) as unknown as Item[];
  const successPayment = payments.find((p) => p.status === "성공");

  const pg = await getCenterPg(supabase, inv.center_id);

  const canPay = inv.status === "청구" || inv.status === "실패" || inv.status === "대기";
  const canRefund = inv.status === "결제완료";
  const isTestMode = pg.mode === "test";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>
            {inv.students?.name ?? "-"}{" "}
            <span className="muted" style={{ fontSize: 16, fontWeight: 600 }}>
              · {fmtKRW(inv.amount)}
            </span>
          </h1>
          <p className="subtext">
            <Link
              href={`/admin/billing?ym=${inv.period}`}
              style={{ color: "var(--muted)" }}
            >
              ← {inv.period} 청구서
            </Link>
            {" · "}
            <span className={`badge ${SB[inv.status] ?? "gray"}`}>
              {inv.status}
            </span>
            {" · "}청구일 {inv.issued_at?.slice(0, 10) ?? "-"}
            {" · "}납기일 {inv.due_date ?? "-"}
          </p>
        </div>
        <div className="toolbar">
          {canPay && (
            <PayButton
              invoiceId={inv.id}
              amount={Number(inv.amount)}
              orderName={`${inv.period} 수강료 · ${inv.students?.name ?? ""}`}
              storeId={pg.storeId}
              channelKey={pg.channelKey}
            />
          )}
          <form action={deleteInvoiceDetail.bind(null, inv.id)}>
            <ConfirmButton
              message={`'${inv.students?.name ?? "학생"}' 의 ${inv.period} 청구서를 삭제할까요?`}
              className="btn danger"
              type="submit"
            >
              삭제
            </ConfirmButton>
          </form>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">청구 정보</p>
          </div>
          <div className="panel-body">
            <div className="detail-block" style={{ marginTop: 0 }}>
              <p className="detail-title">학생</p>
              <div className="info-list">
                <div className="info-row">
                  <span>학생명</span>
                  <strong>
                    {inv.students?.id ? (
                      <Link
                        href={`/admin/students/${inv.students.id}`}
                        style={{ color: "var(--text)" }}
                      >
                        {inv.students.name ?? "-"} →
                      </Link>
                    ) : (
                      inv.students?.name ?? "-"
                    )}
                  </strong>
                </div>
                <div className="info-row">
                  <span>청구 기간</span>
                  <strong>{inv.period}</strong>
                </div>
                <div className="info-row">
                  <span>발생 출처</span>
                  <strong>{inv.source ?? "-"}</strong>
                </div>
              </div>
            </div>

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
                  {items.length === 0 && (
                    <tr>
                      <td>(항목 없음)</td>
                      <td style={{ textAlign: "right" }}>{fmtKRW(inv.amount)}</td>
                    </tr>
                  )}
                  {items.map((it) => (
                    <tr key={it.id}>
                      <td>{it.label}</td>
                      <td style={{ textAlign: "right" }}>{fmtKRW(it.amount)}</td>
                    </tr>
                  ))}
                  <tr>
                    <td style={{ fontWeight: 900 }}>합계</td>
                    <td style={{ textAlign: "right", fontWeight: 900 }}>
                      {fmtKRW(inv.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="detail-block">
              <p className="detail-title">수동 상태 처리</p>
              <p className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                PG 사용 안 하는 수동 수납·환불의 경우 사용. PortOne 결제는 위 "결제하기"로.
              </p>
              <div className="action-grid">
                {["청구", "결제완료", "실패", "환불"].map((st) => (
                  <form
                    key={st}
                    action={setInvoiceStatusDetail.bind(null, inv.id, st)}
                  >
                    <button
                      type="submit"
                      className={`btn${st === "결제완료" ? " primary" : st === "환불" ? " warn" : st === "실패" ? " danger" : ""}`}
                      style={{ width: "100%" }}
                      disabled={inv.status === st}
                    >
                      {st === "결제완료" ? "결제완료 처리" : st === "환불" ? "환불 처리" : st === "실패" ? "실패 처리" : "청구로 되돌리기"}
                    </button>
                  </form>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">결제 정보 (영수증)</p>
            {successPayment && (
              <span className="badge green">결제 완료</span>
            )}
          </div>
          <div className="panel-body">
            {!successPayment ? (
              <div className="empty-state">
                <strong>아직 결제 정보가 없습니다</strong>
                <p>
                  {canPay
                    ? "상단 [결제하기] 로 PortOne 결제창을 띄우거나, [결제완료 처리] 로 수동 수납하세요."
                    : `현재 상태: ${inv.status}`}
                </p>
                {isTestMode && canPay && (
                  <div
                    className="approval-note"
                    style={{
                      marginTop: 10,
                      whiteSpace: "pre-wrap",
                      fontSize: 12,
                      color: "var(--muted)",
                    }}
                  >
                    [테스트 모드] 토스페이먼츠 테스트 카드:{"\n"}
                    카드번호 4242-4242-4242-4242 (또는 5365-1234-5678-1234){"\n"}
                    유효기간: 미래 아무거나 / CVC: 아무거나 / 비밀번호 앞2자리: 00
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">카드 정보</p>
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
                      <span>거래번호</span>
                      <strong
                        style={{
                          fontFamily: "monospace",
                          fontSize: 11,
                          wordBreak: "break-all",
                        }}
                      >
                        {successPayment.pg_tx_id ?? "-"}
                      </strong>
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
                  </div>
                </div>

                {successPayment.receipt_url && (
                  <div className="detail-block">
                    <p className="detail-title">영수증</p>
                    {successPayment.provider === "portone-dummy" ? (
                      <p className="muted" style={{ fontSize: 12 }}>
                        더미 데이터라 영수증 URL은 작동하지 않습니다. 실제 PortOne 결제 시
                        PortOne 호스팅 영수증 페이지로 연결됩니다.
                      </p>
                    ) : (
                      <a
                        href={successPayment.receipt_url}
                        target="_blank"
                        rel="noreferrer"
                        className="btn primary"
                      >
                        영수증 보기 ↗
                      </a>
                    )}
                  </div>
                )}

                {canRefund && (
                  <div className="detail-block">
                    <p className="detail-title">환불</p>
                    <form action={setInvoiceStatusDetail.bind(null, inv.id, "환불")}>
                      <ConfirmButton
                        message={`${inv.students?.name ?? "학생"} 의 결제를 환불 처리할까요?\n(PortOne 실제 환불은 추후 구현 예정 — 현재는 상태만 변경)`}
                        className="btn warn"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        환불 처리
                      </ConfirmButton>
                    </form>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {payments.length > 1 && (
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">결제 이력 (재시도 포함)</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>일시</th>
                <th>상태</th>
                <th>금액</th>
                <th>카드</th>
                <th>승인번호</th>
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
                  <td className="muted">
                    {p.card_name ?? "-"}
                    {p.card_number_masked && (
                      <div
                        className="muted"
                        style={{ fontFamily: "monospace", fontSize: 11 }}
                      >
                        {p.card_number_masked}
                      </div>
                    )}
                  </td>
                  <td className="muted" style={{ fontFamily: "monospace" }}>
                    {p.approval_no ?? "-"}
                  </td>
                  <td className="muted">{p.failed_reason ?? "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
