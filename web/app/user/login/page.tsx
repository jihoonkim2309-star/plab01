"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function UserLogin() {
  const supabase = createClient();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMsg("로그인 실패: " + error.message);
      setLoading(false);
      return;
    }
    // 단일세션 ack + role 따라 분기
    await fetch("/api/auth/take-session?force=1", { method: "POST" });
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase
        .from("users")
        .select("role")
        .eq("id", session.user.id)
        .single();
      const role = (data as { role?: string } | null)?.role;
      if (role === "parent") router.replace("/parent");
      else if (role === "student") router.replace("/student");
      else {
        setMsg("회원(학부모/학생) 계정이 아닙니다.");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }

  return (
    <>
      <div style={{ flex: 1, padding: "40px 24px", display: "flex", flexDirection: "column", justifyContent: "center", background: "#fff" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" style={{ height: 28, marginBottom: 14 }} />
          <h1 style={{ fontSize: 18, fontWeight: 800 }}>학부모·학생 로그인</h1>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 4 }}>
            자녀(본인) 수강·결제·리포트 확인
          </p>
        </div>

        <form onSubmit={onSubmit}>
          <Field label="이메일">
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
          </Field>
          <Field label="비밀번호">
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </Field>

          {msg && (
            <div style={{ padding: 10, background: "#fef2f2", color: "#b42318", borderRadius: 8, fontSize: 12, marginBottom: 12 }}>
              {msg}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%", padding: "12px 0", borderRadius: 10, border: 0,
              background: "linear-gradient(135deg, #1e794e, #2a9162)", color: "#fff",
              fontWeight: 800, fontSize: 15, cursor: "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "처리 중..." : "로그인"}
          </button>

          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 12 }}>
            <a href="/reset-password" style={{ color: "#6f7d78", textDecoration: "none" }}>
              비밀번호 찾기
            </a>
            <a href="/user/signup" style={{ color: "var(--brand, #1e794e)", fontWeight: 700, textDecoration: "none" }}>
              회원 가입 →
            </a>
          </div>
        </form>
      </div>
    </>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 4 }}>{label}</label>
      <div className="user-auth-field">{children}</div>
      <style>{`
        .user-auth-field input,
        .user-auth-field select {
          width: 100%;
          padding: 10px 12px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
          background: #fff;
          font-size: 14px;
          font-family: inherit;
          box-sizing: border-box;
        }
        .user-auth-field input:focus,
        .user-auth-field select:focus {
          border-color: var(--brand, #1e794e);
          outline: 2px solid #d8ecdf;
        }
      `}</style>
    </div>
  );
}
