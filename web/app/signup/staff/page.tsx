"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";

// 관리자 가입 — 지점관리자(admin) / 코치(coach) / 기사(driver).
// 가입 후 user_metadata.applying_role 로 신청 → 슈퍼어드민 승인 후 활성.
export default function SignupStaff() {
  const supabase = createClient();
  const [role, setRole] = useState<"admin" | "coach" | "driver">("admin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [centerId, setCenterId] = useState("");
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.rpc("list_centers_for_signup").then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setCenters(data as { id: string; name: string }[]);
      }
    });
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (password !== passwordConfirm) {
      setMsg("비밀번호가 일치하지 않습니다.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          phone,
          applying_center_id: centerId || null,
          applying_role: role,
        },
      },
    });
    if (error) {
      const m = (error.message || "").toLowerCase();
      let friendly: string;
      if (m.includes("already") || m.includes("registered")) {
        friendly = "이미 가입된 이메일입니다. 로그인해 주세요.";
      } else if (m.includes("password") && m.includes("short")) {
        friendly = "비밀번호가 너무 짧습니다 (최소 8자).";
      } else if (m.includes("invalid") && m.includes("email")) {
        friendly = "이메일 형식이 올바르지 않습니다.";
      } else {
        friendly = "가입 실패: " + error.message;
      }
      setMsg(friendly);
      setLoading(false);
      return;
    }
    setMsg(
      "가입 신청이 접수되었습니다.\n슈퍼어드민이 승인하면 관리자 화면에 접근할 수 있습니다.",
    );
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #fff8eb, #fff)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Pretendard Variable, Pretendard, -apple-system, 'Noto Sans KR', 'Segoe UI', Roboto, Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 440 }}>
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" style={{ height: 26, marginBottom: 14 }} />
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>관리자 가입</h1>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 4 }}>
            지점 관리자 / 코치 / 기사 — 슈퍼어드민 승인 후 활성
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginBottom: 14 }}>
            {(["admin", "coach", "driver"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: "10px 0",
                  borderRadius: 10,
                  border: role === r ? "2px solid #92400e" : "1px solid #e5e7eb",
                  background: role === r ? "#fde68a" : "#fff",
                  color: role === r ? "#92400e" : "#374151",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                {r === "admin" ? "지점관리자" : r === "coach" ? "코치" : "기사"}
              </button>
            ))}
          </div>

          <Field label="이름 *">
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </Field>

          <Field label="연락처">
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder={PHONE_PLACEHOLDER}
              inputMode="numeric"
            />
          </Field>

          <Field label="지점 *">
            <select value={centerId} onChange={(e) => setCenterId(e.target.value)} required>
              <option value="">지점 선택</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="이메일 *">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
          </Field>

          <Field label="비밀번호 (8자 이상) *">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </Field>

          <Field label="비밀번호 확인 *">
            <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={8} />
          </Field>

          {msg && (
            <div style={{
              padding: 10,
              background: msg.startsWith("가입 신청이") ? "#fef3c7" : "#fef2f2",
              color: msg.startsWith("가입 신청이") ? "#92400e" : "#b42318",
              borderRadius: 8,
              fontSize: 12,
              marginTop: 4,
              marginBottom: 12,
              whiteSpace: "pre-wrap",
              lineHeight: 1.5,
            }}>
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px 0",
              borderRadius: 10,
              border: 0,
              background: "linear-gradient(135deg, #92400e, #b45309)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 12px rgba(146,64,14,0.32)",
            }}
          >
            {loading ? "처리 중..." : "가입 신청"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
            <Link href="/login" style={{ color: "#92400e", fontWeight: 700, textDecoration: "none" }}>
              로그인
            </Link>{" "}
            ·{" "}
            <Link href="/signup" style={{ color: "#6f7d78", textDecoration: "none" }}>
              다른 유형
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <div className="staff-signup-field">{children}</div>
      <style>{`
        .staff-signup-field input,
        .staff-signup-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 14px;
          font-family: inherit;
        }
        .staff-signup-field input:focus,
        .staff-signup-field select:focus {
          border-color: #92400e;
          outline: 2px solid #fde68a;
        }
      `}</style>
    </div>
  );
}
