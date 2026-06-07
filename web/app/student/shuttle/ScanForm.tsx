"use client";

import { useState, useTransition } from "react";
import { ScanLine } from "lucide-react";

export default function ScanForm() {
  const [token, setToken] = useState("");
  const [action, setAction] = useState<"승차" | "하차">("승차");
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  function submit() {
    if (!token.trim()) {
      setResult({ ok: false, msg: "차량 QR 토큰을 입력하세요." });
      return;
    }
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/shuttle/scan", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ vehicle_token: token.trim(), action }),
        });
        const data = await res.json();
        if (!res.ok) {
          setResult({ ok: false, msg: data.error ?? "스캔 실패" });
          return;
        }
        setResult({ ok: true, msg: `${action} 기록됨` });
        setToken("");
      } catch (e) {
        setResult({ ok: false, msg: "네트워크 오류" });
      }
    });
  }

  return (
    <section className="card">
      <strong style={{ display: "block", marginBottom: 12 }}>QR 스캔 / 토큰 입력</strong>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 12 }}>
        {(["승차", "하차"] as const).map((a) => {
          const on = action === a;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setAction(a)}
              style={{
                padding: "10px 0",
                borderRadius: 10,
                border: on ? "2px solid var(--brand, #1e794e)" : "1px solid #e5e7eb",
                background: on ? "var(--brand-soft, #d8ecdf)" : "#fff",
                color: on ? "var(--brand, #1e794e)" : "#374151",
                fontWeight: on ? 800 : 600,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              {a}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        value={token}
        onChange={(e) => setToken(e.target.value)}
        placeholder="차량 QR 안 토큰을 입력 또는 붙여넣기"
        style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #e5e7eb", fontSize: 14, boxSizing: "border-box" }}
      />

      <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8, lineHeight: 1.5 }}>
        실 운영 시 카메라로 차량 QR 을 찍어 자동 인식됩니다. 지금은 토큰 직접 입력으로 대체.
      </p>

      <button
        type="button"
        onClick={submit}
        disabled={pending}
        className="btn primary"
        style={{ width: "100%", marginTop: 12, padding: "12px 0", fontSize: 14, fontWeight: 700, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}
      >
        <ScanLine size={18} />
        {pending ? "처리 중..." : `${action} 기록`}
      </button>

      {result && (
        <div style={{ marginTop: 10, padding: "10px 12px", background: result.ok ? "#dcfce7" : "#fee2e2", color: result.ok ? "#1e794e" : "#b42318", borderRadius: 8, fontSize: 12, fontWeight: 700 }}>
          {result.ok ? "✓" : "⚠"} {result.msg}
        </div>
      )}
    </section>
  );
}
