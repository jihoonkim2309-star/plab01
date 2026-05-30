"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import * as PortOne from "@portone/browser-sdk/v2";
import { markOfflinePayment, requestParentPayment } from "./actions";

type Channel = "parent_portal" | "pg_in_store" | "offline";
type OfflineMethod = "offline_cash" | "offline_card" | "offline_transfer";

const OFFLINE_LABELS: Record<OfflineMethod, string> = {
  offline_cash: "현금",
  offline_card: "카드(단말기)",
  offline_transfer: "계좌이체",
};

const CARD_BRANDS = [
  "신한카드",
  "삼성카드",
  "국민카드",
  "현대카드",
  "롯데카드",
  "BC카드",
  "우리카드",
  "농협카드",
  "기타",
];

export default function PayInvoiceModal({
  invoiceId,
  studentName,
  amount,
  period,
  dueDate,
  storeId,
  channelKey,
  backUrl,
}: {
  invoiceId: string;
  studentName: string;
  amount: number;
  period: string;
  dueDate: string | null;
  storeId: string | null;
  channelKey: string | null;
  backUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [channel, setChannel] = useState<Channel>("offline");
  const [offlineMethod, setOfflineMethod] = useState<OfflineMethod>("offline_cash");
  const [memo, setMemo] = useState("");
  const [approvalNo, setApprovalNo] = useState("");
  const [cardBrand, setCardBrand] = useState("");
  const [cardApprovedAt, setCardApprovedAt] = useState("");
  const [transferName, setTransferName] = useState("");
  const [transferAt, setTransferAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const parentFormRef = useRef<HTMLFormElement>(null);
  const offlineFormRef = useRef<HTMLFormElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open, busy]);

  useEffect(() => {
    if (open) {
      setChannel("offline");
      setOfflineMethod("offline_cash");
      setMemo("");
      setApprovalNo("");
      setCardBrand("");
      setTransferName("");
      // datetime-local 기본값 = 지금 (YYYY-MM-DDTHH:MM, 로컬타임존)
      const now = new Date();
      const tzOff = now.getTimezoneOffset() * 60000;
      const localNow = new Date(now.getTime() - tzOff).toISOString().slice(0, 16);
      setCardApprovedAt(localNow);
      setTransferAt(localNow);
      setBusy(false);
      setMsg(null);
    }
  }, [open]);

  async function payViaPg() {
    if (!storeId || !channelKey) {
      setMsg("PG 미설정 — 설정 > 결제(PG) 연동에서 키를 입력하세요.");
      return;
    }
    setBusy(true);
    setMsg(null);
    const paymentId = `inv-${invoiceId}-${Date.now()}`;
    try {
      const req = {
        storeId,
        channelKey,
        paymentId,
        orderName: `${period} 수강료 · ${studentName}`,
        totalAmount: amount,
        currency: "KRW",
        payMethod: "CARD",
      } as Parameters<typeof PortOne.requestPayment>[0];
      const r = await PortOne.requestPayment(req);
      if (r?.code) {
        setMsg("결제 취소/실패: " + (r.message ?? r.code));
        setBusy(false);
        return;
      }
      const res = await fetch("/api/portone/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId, invoiceId }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setMsg("검증 실패: " + (data.error ?? res.status));
        setBusy(false);
        return;
      }
      window.location.reload();
    } catch (e) {
      setMsg("오류: " + (e as Error).message);
      setBusy(false);
    }
  }

  function onProceed() {
    if (busy) return;
    setMsg(null);
    if (channel === "parent_portal") {
      parentFormRef.current?.requestSubmit();
    } else if (channel === "pg_in_store") {
      void payViaPg();
    } else {
      offlineFormRef.current?.requestSubmit();
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn"
        style={{ minHeight: 30, padding: "4px 10px" }}
        onClick={() => setOpen(true)}
      >
        결제 처리
      </button>
      {open && mounted &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget && !busy) setOpen(false);
            }}
          >
            <div className="modal-card" style={{ maxWidth: 520 }}>
              <div className="panel-head" style={{ padding: "16px 20px 8px" }}>
                <p className="panel-title">결제 처리</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => !busy && setOpen(false)}
                  disabled={busy}
                  style={{ minHeight: 30, padding: "4px 10px" }}
                  aria-label="닫기"
                >
                  ✕
                </button>
              </div>
              <div className="panel-body" style={{ padding: "8px 20px 16px" }}>
                <div
                  style={{
                    padding: "12px 14px",
                    background: "var(--bg)",
                    border: "1px solid var(--line)",
                    borderRadius: 8,
                    marginBottom: 14,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 6,
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span className="muted">학생</span>{" "}
                    <strong>{studentName}</strong>
                  </div>
                  <div>
                    <span className="muted">청구월</span>{" "}
                    <strong>{period}</strong>
                  </div>
                  <div>
                    <span className="muted">금액</span>{" "}
                    <strong>{amount.toLocaleString()}원</strong>
                  </div>
                  <div>
                    <span className="muted">납기</span>{" "}
                    <strong>{dueDate ?? "-"}</strong>
                  </div>
                </div>

                <div className="field span-2" style={{ marginBottom: 12 }}>
                  <label style={{ marginBottom: 6 }}>결제 채널</label>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <ChannelRow
                      value="parent_portal"
                      current={channel}
                      onChange={setChannel}
                      label="학부모 포털 결제 요청"
                      desc="학부모 앱에 결제 요청 알림을 보냅니다."
                    />
                    <ChannelRow
                      value="pg_in_store"
                      current={channel}
                      onChange={setChannel}
                      label="지점 PG"
                      desc={
                        storeId && channelKey
                          ? "어드민이 결제창을 열어 카드 결제합니다."
                          : "PG 미설정 — 설정 > 결제 연동 필요"
                      }
                      disabled={!storeId || !channelKey}
                    />
                    <ChannelRow
                      value="offline"
                      current={channel}
                      onChange={setChannel}
                      label="오프라인 수납"
                      desc="현금/카드(단말기)/계좌이체 직접 수납"
                    />
                  </div>
                </div>

                {channel === "offline" && (
                  <div
                    className="field span-2"
                    style={{
                      padding: 12,
                      background: "var(--bg)",
                      border: "1px solid var(--line)",
                      borderRadius: 8,
                    }}
                  >
                    <label style={{ marginBottom: 6 }}>수납 방법 *</label>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
                      {(Object.keys(OFFLINE_LABELS) as OfflineMethod[]).map((m) => {
                        const on = offlineMethod === m;
                        return (
                          <button
                            key={m}
                            type="button"
                            onClick={() => setOfflineMethod(m)}
                            className={`btn${on ? " primary" : ""}`}
                            style={{ minHeight: 30, padding: "4px 12px" }}
                          >
                            {OFFLINE_LABELS[m]}
                          </button>
                        );
                      })}
                    </div>

                    {offlineMethod === "offline_cash" && (
                      <>
                        <label style={{ marginBottom: 6 }}>메모</label>
                        <textarea
                          value={memo}
                          onChange={(e) => setMemo(e.target.value)}
                          rows={2}
                          placeholder="영수증 번호 등 (선택)"
                        />
                      </>
                    )}

                    {offlineMethod === "offline_card" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ marginBottom: 6 }}>승인번호</label>
                          <input
                            type="text"
                            value={approvalNo}
                            onChange={(e) => setApprovalNo(e.target.value)}
                            placeholder="단말기 영수증 8자리"
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label style={{ marginBottom: 6 }}>승인일시</label>
                          <input
                            type="datetime-local"
                            value={cardApprovedAt}
                            onChange={(e) => setCardApprovedAt(e.target.value)}
                          />
                        </div>
                        <div style={{ gridColumn: "1 / -1" }}>
                          <label style={{ marginBottom: 6 }}>카드사</label>
                          <select
                            value={cardBrand}
                            onChange={(e) => setCardBrand(e.target.value)}
                          >
                            <option value="">선택 안 함</option>
                            {CARD_BRANDS.map((b) => (
                              <option key={b} value={b}>
                                {b}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span
                          className="muted"
                          style={{ fontSize: 12, gridColumn: "1 / -1" }}
                        >
                          승인번호 + 승인일시는 단말기 취소 시 원거래 매칭에
                          사용됩니다. 영수증 보고 입력 권장.
                        </span>
                      </div>
                    )}

                    {offlineMethod === "offline_transfer" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ marginBottom: 6 }}>입금자명</label>
                          <input
                            type="text"
                            value={transferName}
                            onChange={(e) => setTransferName(e.target.value)}
                            placeholder="통장 표시 이름 (학부모 등)"
                          />
                        </div>
                        <div>
                          <label style={{ marginBottom: 6 }}>입금 일시</label>
                          <input
                            type="datetime-local"
                            value={transferAt}
                            onChange={(e) => setTransferAt(e.target.value)}
                          />
                        </div>
                        <span
                          className="muted"
                          style={{ fontSize: 12, gridColumn: "1 / -1" }}
                        >
                          통장 내역 매칭을 위해 입력 권장 (선택)
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {msg && (
                  <div className="field-error-text" style={{ marginTop: 10 }}>
                    {msg}
                  </div>
                )}
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                >
                  취소
                </button>
                <button
                  type="button"
                  className="btn primary"
                  disabled={busy}
                  onClick={onProceed}
                >
                  {busy ? "처리 중..." : "진행"}
                </button>
              </div>

              {/* hidden forms — channel 별 server action submit 용 */}
              <form ref={parentFormRef} action={requestParentPayment} style={{ display: "none" }}>
                <input type="hidden" name="ids" value={invoiceId} />
                <input type="hidden" name="back" value={backUrl} />
              </form>
              <form ref={offlineFormRef} action={markOfflinePayment} style={{ display: "none" }}>
                <input type="hidden" name="invoice_id" value={invoiceId} />
                <input type="hidden" name="payment_method" value={offlineMethod} />
                <input type="hidden" name="memo" value={memo} />
                <input type="hidden" name="approval_no" value={approvalNo} />
                <input type="hidden" name="card_brand" value={cardBrand} />
                <input type="hidden" name="card_approved_at" value={cardApprovedAt} />
                <input type="hidden" name="transfer_name" value={transferName} />
                <input type="hidden" name="transfer_at" value={transferAt} />
                <input type="hidden" name="back" value={backUrl} />
              </form>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

function ChannelRow({
  value,
  current,
  onChange,
  label,
  desc,
  disabled,
}: {
  value: Channel;
  current: Channel;
  onChange: (v: Channel) => void;
  label: string;
  desc: string;
  disabled?: boolean;
}) {
  const on = current === value;
  return (
    <label
      style={{
        display: "flex",
        alignItems: "flex-start",
        gap: 10,
        padding: "10px 12px",
        border: `1px solid ${on ? "var(--brand)" : "var(--line)"}`,
        background: on ? "var(--green-soft)" : "var(--bg)",
        borderRadius: 8,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <input
        type="radio"
        name="channel"
        checked={on}
        disabled={disabled}
        onChange={() => onChange(value)}
        style={{ marginTop: 3 }}
      />
      <div>
        <div style={{ fontWeight: 700 }}>{label}</div>
        <div className="muted" style={{ fontSize: 12 }}>
          {desc}
        </div>
      </div>
    </label>
  );
}
