"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);

    if (mode === "signin") {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg("로그인 실패: " + error.message);
        setLoading(false);
        return;
      }
      window.location.assign("/prototype.html");
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) {
        setMsg("회원가입 실패: " + error.message);
        setLoading(false);
        return;
      }
      setMsg(
        "가입 완료. 이메일 인증이 켜져 있으면 메일함을 확인하세요. 인증이 꺼져 있으면 바로 로그인됩니다.",
      );
      setMode("signin");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-100 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow p-8">
        <div className="flex justify-center mb-5">
          <span className="inline-flex items-center bg-[#1e794e] rounded-lg px-4 py-2 shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/planb-logo.svg" alt="PlanB" className="h-5" />
          </span>
        </div>
        <h1 className="text-xl font-bold text-zinc-900 text-center">플랜비 본점 · 어드민</h1>
        <p className="mt-1 text-sm text-zinc-500 text-center">
          {mode === "signin" ? "관리자 로그인" : "관리자 계정 만들기"}
        </p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {mode === "signup" && (
            <div>
              <label className="block text-sm font-medium text-zinc-700">이름</label>
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-zinc-700">이메일</label>
            <input
              type="email"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-zinc-700">비밀번호</label>
            <input
              type="password"
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={6}
              required
            />
          </div>

          {msg && <p className="text-sm text-rose-600">{msg}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-zinc-900 text-white py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "처리 중..." : mode === "signin" ? "로그인" : "회원가입"}
          </button>
        </form>

        <button
          onClick={() => {
            setMode(mode === "signin" ? "signup" : "signin");
            setMsg(null);
          }}
          className="mt-4 w-full text-sm text-zinc-500 hover:text-zinc-800"
        >
          {mode === "signin"
            ? "관리자 계정이 없으신가요? 회원가입"
            : "이미 계정이 있으신가요? 로그인"}
        </button>
      </div>
    </div>
  );
}
