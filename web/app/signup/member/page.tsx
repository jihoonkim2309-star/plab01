"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";

// 회원 가입 — 학부모 / 학생.
// 가입 후 user_metadata.applying_role = 'parent' | 'student'.
// 트리거가 role 즉시 부여 (관리자는 admin 승인 필요, 회원은 자동 활성).
export default function SignupMember() {
  const supabase = createClient();
  const [role, setRole] = useState<"parent" | "student">("parent");
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
      "가입이 완료되었습니다. 이메일을 확인 후 로그인해 주세요.\n로그인 후 자녀 연결 신청 (학부모) 또는 본인 학생 연결 (학생) 단계로 진행합니다.",
    );
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f6faf8, #fff)",
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
          <h1 style={{ fontSize: 20, fontWeight: 800 }}>회원 가입</h1>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 4 }}>
            학부모 또는 학생 본인 계정을 만듭니다
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ background: "#fff", borderRadius: 14, padding: 20, boxShadow: "0 1px 3px rgba(0,0,0,.04)" }}>
          {/* role 토글 */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 14 }}>
            {(["parent", "student"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setRole(r)}
                style={{
                  padding: "10px 0",
                  borderRadius: 10,
                  border: role === r ? "2px solid var(--brand, #1e794e)" : "1px solid #e5e7eb",
                  background: role === r ? "var(--brand-soft, #d8ecdf)" : "#fff",
                  color: role === r ? "var(--brand, #1e794e)" : "#374151",
                  fontWeight: 700,
                  fontSize: 14,
                  cursor: "pointer",
                }}
              >
                {r === "parent" ? "학부모" : "학생 본인"}
              </button>
            ))}
          </div>

          <FormField label="이름 *">
            <input value={name} onChange={(e) => setName(e.target.value)} required placeholder={role === "parent" ? "보호자 본인 이름" : "본인 이름"} />
          </FormField>

          <FormField label="연락처">
            <input
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
              placeholder={PHONE_PLACEHOLDER}
              inputMode="numeric"
            />
          </FormField>

          <FormField label="지점 *">
            <select value={centerId} onChange={(e) => setCenterId(e.target.value)} required>
              <option value="">지점 선택</option>
              {centers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </FormField>

          <FormField label="이메일 *">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
          </FormField>

          <FormField label="비밀번호 (8자 이상) *">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} />
          </FormField>

          <FormField label="비밀번호 확인 *">
            <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)} required minLength={8} />
          </FormField>

          {msg && (
            <div style={{
              padding: 10,
              background: msg.startsWith("가입이 완료") ? "#d8ecdf" : "#fef2f2",
              color: msg.startsWith("가입이 완료") ? "#1e794e" : "#b42318",
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
              background: "linear-gradient(135deg, #1e794e, #2a9162)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              opacity: loading ? 0.7 : 1,
              boxShadow: "0 4px 12px rgba(30,121,78,0.32)",
            }}
          >
            {loading ? "처리 중..." : "회원 가입"}
          </button>

          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12 }}>
            이미 계정이 있나요?{" "}
            <Link href="/login" style={{ color: "var(--brand, #1e794e)", fontWeight: 700, textDecoration: "none" }}>
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

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <div className="member-signup-field">{children}</div>
      <style>{`
        .member-signup-field input,
        .member-signup-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 14px;
          font-family: inherit;
        }
        .member-signup-field input:focus,
        .member-signup-field select:focus {
          border-color: var(--brand, #1e794e);
          outline: 2px solid #d8ecdf;
        }
      `}</style>
    </div>
  );
}
