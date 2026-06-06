"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard } from "lucide-react";

// 학부모 invoice 결제 — PortOne 결제창 → /api/portone/verify → 결제완료 마킹.
// 지점 (center) 의 pg_store_id / pg_channel_key 사용.
export default function PayButton({
  invoiceId,
  amount,
  period,
  studentName,
  storeId,
  channelKey,
}: {
  invoiceId: string;
  amount: number;
  period: string;
  studentName: string;
  storeId: string | null;
  channelKey: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const hasPg = !!(storeId && channelKey);

  async function onPay() {
    if (!hasPg) {
      setMsg("지점에서 결제 연동 (PG) 이 아직 설정되지 않았습니다. 지점에 문의해 주세요.");
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const { default: PortOne } = await import("@portone/browser-sdk/v2");
      const paymentId = `inv-${invoiceId}-${Date.now()}`;
      const req = {
        storeId: storeId as string,
        channelKey: channelKey as string,
        paymentId,
        orderName: `${period} 수강료 · ${studentName}`,
        totalAmount: amount,
        currency: "KRW",
        payMethod: "CARD",
        // 모바일 = 전체 페이지로 redirect (iframe 모달이 화면 폭 넘는 문제 회피)
        windowType: {
          iframe: "POPUP",
          mobile: "REDIRECTION",
        },
        redirectUrl: `${window.location.origin}/parent/billing/${invoiceId}?paid=1`,
      } as unknown as Parameters<typeof PortOne.requestPayment>[0];
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
      router.refresh();
    } catch (e) {
      setMsg("오류: " + (e as Error).message);
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <button
        type="button"
        onClick={onPay}
        disabled={busy}
        className="btn primary"
        style={{
          width: "100%",
          padding: "14px 0",
          fontSize: 15,
          fontWeight: 700,
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          opacity: busy ? 0.7 : 1,
        }}
      >
        <CreditCard size={18} />
        {busy ? "결제 처리 중..." : "지금 결제하기"}
      </button>
      {msg && (
        <p style={{ fontSize: 12, color: "#b42318", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
          {msg}
        </p>
      )}
      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
        결제는 지점 등록된 PG (포트원) 를 통해 안전하게 처리됩니다.
      </p>
    </section>
  );
}
