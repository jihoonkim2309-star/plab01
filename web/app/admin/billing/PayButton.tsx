"use client";

import { useState } from "react";
import * as PortOne from "@portone/browser-sdk/v2";

export default function PayButton({
  invoiceId,
  amount,
  orderName,
  storeId,
  channelKey,
}: {
  invoiceId: string;
  amount: number;
  orderName: string;
  storeId: string | null;
  channelKey: string | null;
}) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!storeId || !channelKey) {
    return (
      <span className="muted" title="설정 > 결제(PG) 연동에서 키 입력">
        PG 미설정
      </span>
    );
  }

  async function pay() {
    setBusy(true);
    setMsg(null);
    const paymentId = `inv-${invoiceId}-${Date.now()}`;
    try {
      const req = {
        storeId: storeId!,
        channelKey: channelKey!,
        paymentId,
        orderName,
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

  return (
    <span>
      <button
        type="button"
        className="btn primary"
        style={{ minHeight: 30, padding: "4px 10px" }}
        disabled={busy}
        onClick={pay}
      >
        {busy ? "결제 중..." : "결제하기"}
      </button>
      {msg && (
        <div className="field-error-text" style={{ marginTop: 4 }}>
          {msg}
        </div>
      )}
    </span>
  );
}
