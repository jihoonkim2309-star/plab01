"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePaymentDrawer } from "./PaymentDrawerContext";
import PaymentReceipt from "./PaymentReceipt";

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

type Item = { id: string; label: string; amount: number };

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

type Detail = {
  invoice: Invoice;
  items: Item[];
  payments: Payment[];
  center: { name: string | null; address: string | null; contact_phone: string | null } | null;
};

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

function fmtKRW(n: number | null | undefined) {
  return `${Number(n ?? 0).toLocaleString()}원`;
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 16).replace("T", " ");
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export default function PaymentDetailDrawer() {
  const { invoiceId } = usePaymentDrawer();
  const [data, setData] = useState<Detail | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!invoiceId) {
      setData(null);
      return;
    }
    setLoading(true);
    setData(null);
    let cancelled = false;
    fetch(`/api/admin/payment-status/${invoiceId}/detail`)
      .then((r) => r.json())
      .then((d: Detail) => {
        if (cancelled) return;
        setData(d);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [invoiceId]);

  const detail = data?.invoice;
  const items = data?.items ?? [];
  const payments = data?.payments ?? [];
  const center = data?.center;
  const successPayment = payments.find((p) => p.status === "성공");

  return (
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
        {!invoiceId && (
          <div className="empty-state">
            <strong>선택된 내역이 없습니다</strong>
            <p>왼쪽 목록에서 학생을 선택하면 결제 정보·영수증·환불 처리가 여기 나타납니다.</p>
          </div>
        )}
        {loading && (
          <div className="empty-state">
            <div className="muted">불러오는 중...</div>
          </div>
        )}
        {!loading && invoiceId && !detail && (
          <div className="empty-state">
            <strong>청구서를 찾을 수 없습니다</strong>
          </div>
        )}
        {detail && (
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
                        <td style={{ textAlign: "right" }}>{fmtKRW(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="detail-block">
              <p className="detail-title">결제 정보</p>
              {!successPayment ? (
                <div className="muted" style={{ fontSize: 13 }}>
                  아직 결제 정보가 없습니다.{" "}
                  <Link
                    href={`/admin/billing?ym=${detail.period}`}
                    style={{ color: "var(--brand)" }}
                  >
                    청구 관리에서 결제하기 →
                  </Link>
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
              <p className="detail-title">영수증</p>
              <PaymentReceipt
                center={{
                  name: center?.name ?? null,
                  address: center?.address ?? null,
                  phone: center?.contact_phone ?? null,
                }}
                studentName={detail.students?.name ?? "-"}
                invoicePeriod={detail.period}
                invoiceAmount={Number(detail.amount)}
                invoiceId={detail.id}
                items={items}
                payment={
                  successPayment
                    ? {
                        provider: successPayment.provider,
                        method: successPayment.method,
                        card_name: successPayment.card_name,
                        card_number_masked: successPayment.card_number_masked,
                        installment_months: successPayment.installment_months,
                        approval_no: successPayment.approval_no,
                        pg_tx_id: successPayment.pg_tx_id,
                        paid_at: successPayment.paid_at,
                      }
                    : null
                }
                isPaid={detail.status === "결제완료"}
              />
            </div>

            <div className="detail-block">
              <p className="detail-title">상태 변경·환불</p>
              <p className="muted" style={{ fontSize: 13 }}>
                결제 처리·환불·청구서 삭제는{" "}
                <Link
                  href={`/admin/billing?ym=${detail.period}`}
                  style={{ color: "var(--brand)" }}
                >
                  청구 관리 ({detail.period})
                </Link>{" "}
                에서 진행하세요.
              </p>
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
  );
}
