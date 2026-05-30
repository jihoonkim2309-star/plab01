"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { refundInvoice } from "./actions";

const CHANNEL_LABELS: Record<string, string> = {
  parent_portal: "학부모 포털",
  pg_in_store: "지점 PG",
  offline_cash: "오프라인 — 현금",
  offline_card: "오프라인 — 카드(단말기)",
  offline_transfer: "오프라인 — 계좌이체",
};

export default function RefundModal({
  invoiceId,
  studentName,
  amount,
  period,
  paymentMethod,
  backUrl,
}: {
  invoiceId: string;
  studentName: string;
  amount: number;
  period: string;
  paymentMethod: string | null;
  backUrl: string;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => setMounted(true), []);
  useEffect(() => {
    if (!open) return;
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onEsc);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (open) setReason("");
  }, [open]);

  const channelLabel = paymentMethod
    ? (CHANNEL_LABELS[paymentMethod] ?? paymentMethod)
    : "수동 마킹";

  return (
    <>
      <button
        type="button"
        className="btn warn"
        style={{ minHeight: 30, padding: "4px 10px" }}
        onClick={() => setOpen(true)}
      >
        환불 처리
      </button>
      {open && mounted &&
        createPortal(
          <div
            className="modal-backdrop"
            onClick={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <form
              ref={formRef}
              action={refundInvoice}
              className="modal-card"
              style={{ maxWidth: 480 }}
            >
              <input type="hidden" name="invoice_id" value={invoiceId} />
              <input type="hidden" name="back" value={backUrl} />
              <div className="panel-head" style={{ padding: "16px 20px 8px" }}>
                <p className="panel-title">환불 처리</p>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
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
                    <span className="muted">환불 금액</span>{" "}
                    <strong>{amount.toLocaleString()}원</strong>
                  </div>
                  <div>
                    <span className="muted">원 결제 채널</span>{" "}
                    <strong>{channelLabel}</strong>
                  </div>
                </div>

                <div className="field span-2">
                  <label>환불 사유</label>
                  <textarea
                    name="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    placeholder="선택 — 환불 이력에 기록됩니다"
                  />
                </div>

                <p
                  className="muted"
                  style={{ fontSize: 12, marginTop: 10, color: "var(--orange)" }}
                >
                  ⚠ 환불 처리 시 청구서 상태가 '환불' 로 전환되고 환불 이력이
                  기록됩니다. PG 자동 환불 API 호출은 추후 — 현재는 상태/기록만.
                </p>
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn"
                  onClick={() => setOpen(false)}
                >
                  취소
                </button>
                <button type="submit" className="btn warn">
                  환불 처리
                </button>
              </div>
            </form>
          </div>,
          document.body,
        )}
    </>
  );
}
