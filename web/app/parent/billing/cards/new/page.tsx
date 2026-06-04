"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CreditCard, ShieldCheck } from "lucide-react";

// 학부모 카드 등록 — PortOne SDK 호출.
// 환경변수 NEXT_PUBLIC_PORTONE_STORE_ID / NEXT_PUBLIC_PORTONE_CHANNEL_KEY 필요.
export default function ParentCardNew() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  async function onRegister() {
    setError(null);
    setLoading(true);
    try {
      // dynamic import — SSR 영향 X
      const { default: PortOne } = await import("@portone/browser-sdk/v2");
      const storeId = process.env.NEXT_PUBLIC_PORTONE_STORE_ID;
      const channelKey = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY;
      if (!storeId || !channelKey) {
        setError(
          "PortOne 환경변수가 설정되지 않았습니다. (NEXT_PUBLIC_PORTONE_STORE_ID, NEXT_PUBLIC_PORTONE_CHANNEL_KEY)",
        );
        setLoading(false);
        return;
      }

      const issueId = `bk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const res = await PortOne.requestIssueBillingKey({
        storeId,
        channelKey,
        billingKeyMethod: "CARD",
        issueId,
        issueName: "플랜비 자동결제 카드 등록",
      });

      if (!res || (res as { code?: string }).code) {
        setError(`카드 등록 실패: ${(res as { message?: string }).message ?? "취소됨"}`);
        setLoading(false);
        return;
      }

      // 발급된 빌링키를 서버에 저장
      const r = (res as unknown) as { billingKey: string };
      const saveRes = await fetch("/api/parent/billing-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingKey: r.billingKey, raw: res }),
      });
      if (!saveRes.ok) {
        const j = await saveRes.json().catch(() => ({ error: "save_failed" }));
        setError("서버 저장 실패: " + (j.error ?? saveRes.status));
        setLoading(false);
        return;
      }
      router.push("/parent/billing/cards?msg=registered");
    } catch (e) {
      setError("처리 중 오류: " + (e as Error).message);
      setLoading(false);
    }
  }

  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/billing/cards" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>카드 등록</h1>
        <span style={{ width: 38 }} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ textAlign: "center", padding: 24 }}>
          <CreditCard size={48} color="#1e794e" style={{ margin: "0 auto 10px" }} />
          <strong style={{ display: "block", fontSize: 16 }}>카드를 1회만 등록</strong>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 8, lineHeight: 1.5 }}>
            매월 청구일에 자동으로 결제됩니다. 카드 정보는 PortOne 결제창에서만 입력되며,
            우리는 결제용 토큰만 저장합니다.
          </p>
        </section>

        <section className="card">
          <div className="info-rows">
            <div className="info-row">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={14} color="#1e794e" /> 카드번호 저장
              </span>
              <strong style={{ color: "#1e794e" }}>안 함</strong>
            </div>
            <div className="info-row">
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <ShieldCheck size={14} color="#1e794e" /> PCI-DSS
              </span>
              <strong style={{ color: "#1e794e" }}>PG 사 처리</strong>
            </div>
            <div className="info-row">
              <span>해지 / 변경</span>
              <strong>언제든 가능</strong>
            </div>
          </div>
        </section>

        {error && (
          <div style={{ padding: 10, background: "#fef2f2", color: "#b42318", borderRadius: 8, fontSize: 12, marginTop: 10 }}>
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn primary"
          style={{ width: "100%", marginTop: 12 }}
          onClick={onRegister}
          disabled={loading}
        >
          {loading ? "처리 중..." : "카드 등록하기"}
        </button>
        <p style={{ fontSize: 11, color: "#9ca3af", textAlign: "center", marginTop: 8 }}>
          버튼을 누르면 PortOne 결제창이 열립니다.
        </p>
      </div>
    </>
  );
}
