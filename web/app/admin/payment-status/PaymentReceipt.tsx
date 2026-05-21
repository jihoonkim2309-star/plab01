"use client";

// POS 매출조회 스타일 영수증.
// 클라이언트 컴포넌트 — [인쇄/PDF 저장] 버튼이 window.print() 호출.
// print 시 영수증 영역만 보이도록 admin.css 의 @media print 룰 사용.

type Center = {
  name: string | null;
  address: string | null;
  phone: string | null;
};

type Item = { id: string; label: string; amount: number };

type Payment = {
  provider: string;
  method: string | null;
  card_name: string | null;
  card_number_masked: string | null;
  installment_months: number | null;
  approval_no: string | null;
  pg_tx_id: string | null;
  paid_at: string | null;
};

export default function PaymentReceipt({
  center,
  studentName,
  invoicePeriod,
  invoiceAmount,
  invoiceId,
  items,
  payment,
  isPaid,
}: {
  center: Center;
  studentName: string;
  invoicePeriod: string;
  invoiceAmount: number;
  invoiceId: string;
  items: Item[];
  payment: Payment | null;
  isPaid: boolean;
}) {
  const fmt = (n: number) => Number(n ?? 0).toLocaleString();
  const dt = formatDateTime(payment?.paid_at ?? null);
  const shortId = invoiceId.slice(0, 8).toUpperCase();

  return (
    <div className="receipt-host">
      <div className="receipt-actions no-print">
        <button
          type="button"
          className="btn"
          onClick={() => window.print()}
        >
          🖨 인쇄 / PDF 저장
        </button>
        <span className="muted" style={{ fontSize: 12 }}>
          브라우저 인쇄에서 "PDF 로 저장" 선택 시 PDF 다운로드
        </span>
      </div>

      <div className="receipt-paper">
        <div className="receipt-head">
          <div className="receipt-brand">{center.name ?? "플랜비 본점"}</div>
          {center.address && (
            <div className="receipt-meta">{center.address}</div>
          )}
          {center.phone && (
            <div className="receipt-meta">Tel. {center.phone}</div>
          )}
        </div>

        <div className="receipt-divider" />

        <div className="receipt-info">
          <div className="receipt-line">
            <span>거래일시</span>
            <span>{dt}</span>
          </div>
          <div className="receipt-line">
            <span>거래번호</span>
            <span style={{ fontFamily: "monospace" }}>{shortId}</span>
          </div>
          <div className="receipt-line">
            <span>학생</span>
            <span>{studentName}</span>
          </div>
          <div className="receipt-line">
            <span>청구월</span>
            <span>{invoicePeriod}</span>
          </div>
        </div>

        <div className="receipt-divider" />

        <table className="receipt-items">
          <thead>
            <tr>
              <th style={{ textAlign: "left" }}>품목</th>
              <th style={{ textAlign: "right" }}>금액</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td>{invoicePeriod} 수강료</td>
                <td style={{ textAlign: "right" }}>{fmt(invoiceAmount)}원</td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={it.id}>
                  <td>{it.label}</td>
                  <td style={{ textAlign: "right" }}>{fmt(it.amount)}원</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className="receipt-divider" />

        <div className="receipt-totals">
          <div className="receipt-line">
            <span>합계</span>
            <span>{fmt(invoiceAmount)}원</span>
          </div>
          <div className="receipt-line" style={{ fontWeight: 900 }}>
            <span>승인금액</span>
            <span>
              {payment ? `${fmt(invoiceAmount)}원` : "(미결제)"}
            </span>
          </div>
        </div>

        {payment && (
          <>
            <div className="receipt-divider" />
            <div className="receipt-info">
              <div className="receipt-line">
                <span>결제수단</span>
                <span>
                  {payment.card_name ?? "카드"}
                  {payment.method ? ` (${payment.method})` : ""}
                </span>
              </div>
              {payment.card_number_masked && (
                <div className="receipt-line">
                  <span>카드번호</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {payment.card_number_masked}
                  </span>
                </div>
              )}
              <div className="receipt-line">
                <span>할부</span>
                <span>
                  {payment.installment_months
                    ? `${payment.installment_months}개월`
                    : "일시불"}
                </span>
              </div>
              {payment.approval_no && (
                <div className="receipt-line">
                  <span>승인번호</span>
                  <span style={{ fontFamily: "monospace" }}>
                    {payment.approval_no}
                  </span>
                </div>
              )}
            </div>
          </>
        )}

        <div className="receipt-divider double" />

        <div className="receipt-footer">
          {isPaid ? "감사합니다" : "결제 대기"}
          <div className="receipt-meta" style={{ marginTop: 6 }}>
            {center.name ?? "플랜비 본점"}
          </div>
          {payment?.provider === "portone-dummy" && (
            <div
              className="receipt-meta"
              style={{ marginTop: 6, fontStyle: "italic" }}
            >
              * 더미 영수증 (실결제 아님)
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatDateTime(s: string | null): string {
  if (!s) return "-";
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return s.slice(0, 16).replace("T", " ");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}
function pad(n: number) {
  return String(n).padStart(2, "0");
}
