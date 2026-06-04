"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function StaffLogin() {
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
      if (role === "coach") router.replace("/coach");
      else if (role === "driver") router.replace("/driver");
      else if (role === "admin" || role === "super_admin") {
        document.cookie = "active_center=; max-age=0; path=/";
        window.location.assign("/admin");
      } else {
        setMsg("관리자 계정이 아닙니다. (승인 대기 중일 수 있습니다)");
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }

  return (
    <div style={{
      flex: 1, padding: "56px 24px 24px",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start",
      background: "linear-gradient(180deg, #fef8eb 0%, #fff 60%)",
      overflowY: "auto",
    }}>
      <div style={{ width: "100%", maxWidth: 360, display: "flex", flexDirection: "column", alignItems: "center" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/planb-logo.svg" alt="PlanB" style={{ height: 22, marginBottom: 6 }} />
        <div style={{ position: "relative", width: 160, height: 140 }}>
          <div style={{
            position: "absolute", inset: "-15%",
            background: "radial-gradient(circle, rgba(251,191,36,0.18) 0%, rgba(251,191,36,0.06) 40%, transparent 70%)",
            filter: "blur(14px)",
          }} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/login-hero.svg"
            alt=""
            aria-hidden
            style={{
              position: "relative",
              width: "100%", height: "100%", objectFit: "contain",
              WebkitMaskImage: "radial-gradient(ellipse 70% 60% at center, black 55%, transparent 95%)",
              maskImage: "radial-gradient(ellipse 70% 60% at center, black 55%, transparent 95%)",
            }}
          />
        </div>
        <div style={{ textAlign: "center", marginBottom: 18, marginTop: 4 }}>
          <h1 style={{ fontSize: 17, fontWeight: 800 }}>관리자 로그인</h1>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 4 }}>
            지점관리자·코치·기사
          </p>
        </div>

        <form onSubmit={onSubmit} style={{ width: "100%" }}>
        <Field label="이메일">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="email@example.com" />
        </Field>
        <Field label="비밀번호">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>

        {msg && (
          <div style={{ padding: 10, background: "#fef2f2", color: "#b42318", borderRadius: 8, fontSize: 12, marginBottom: 12, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>
            {msg}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%", padding: "12px 0", borderRadius: 10, border: 0,
            background: "linear-gradient(135deg, #92400e, #b45309)", color: "#fff",
            fontWeight: 800, fontSize: 15, cursor: "pointer",
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? "처리 중..." : "로그인"}
        </button>

        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 12 }}>
          <a href="/reset-password" style={{ color: "#6f7d78", textDecoration: "none" }}>비밀번호 찾기</a>
          <a href="/staff/signup" style={{ color: "#92400e", fontWeight: 700, textDecoration: "none" }}>관리자 가입 →</a>
        </div>
      </form>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, color: "#374151", fontWeight: 600, marginBottom: 6 }}>{label}</label>
      <div className="staff-auth-field">{children}</div>
      <style>{`
        .staff-auth-field input,
        .staff-auth-field select {
          width: 100%; padding: 12px 14px; border-radius: 10px;
          border: 1px solid #e5e7eb; background: #fff; font-size: 14px;
          font-family: inherit; box-sizing: border-box;
          transition: border-color 120ms ease, box-shadow 120ms ease;
        }
        .staff-auth-field input:focus,
        .staff-auth-field select:focus {
          border-color: #92400e; outline: none;
          box-shadow: 0 0 0 3px rgba(251, 191, 36, 0.32);
        }
        .staff-auth-field input::placeholder { color: #c7cdcc; }
      `}</style>
    </div>
  );
}
