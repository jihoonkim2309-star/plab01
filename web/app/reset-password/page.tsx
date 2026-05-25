"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const supabase = createClient();
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  // Supabase 가 URL hash 의 access_token 을 자동으로 세션화. PASSWORD_RECOVERY 이벤트 또는 직접 getSession.
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "PASSWORD_RECOVERY" || session) {
          setHasSession(true);
        }
      },
    );
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setHasSession(true);
      else setHasSession((prev) => (prev === null ? false : prev));
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMsg(null);
    if (password !== passwordConfirm) {
      setError("비밀번호가 일치하지 않습니다.");
      return;
    }
    if (password.length < 6) {
      setError("비밀번호는 6자 이상이어야 합니다.");
      return;
    }
    setLoading(true);
    const { error: updErr } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (updErr) {
      setError("비밀번호 변경 실패: " + updErr.message);
      return;
    }
    setMsg("비밀번호가 변경되었습니다. 잠시 후 로그인 페이지로 이동합니다.");
    setTimeout(() => window.location.assign("/login"), 1500);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-7">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" className="h-7" />
        </div>

        <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
          비밀번호 재설정
        </h1>
        <p className="mt-2 text-sm text-zinc-500">새 비밀번호를 입력해 주세요.</p>

        {hasSession === false && (
          <div className="mt-6 text-sm rounded-md p-3 bg-rose-50 text-rose-700 border border-rose-200">
            유효하지 않거나 만료된 재설정 링크입니다. 로그인 페이지에서 다시 요청해 주세요.
            <div className="mt-2">
              <a href="/login" className="font-semibold text-[#1e794e]">로그인 페이지로 →</a>
            </div>
          </div>
        )}

        {hasSession === true && (
          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">새 비밀번호</label>
              <input
                type="password"
                className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                minLength={6}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">새 비밀번호 확인</label>
              <input
                type="password"
                className={`w-full rounded-md border px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 transition ${
                  passwordConfirm && password !== passwordConfirm
                    ? "border-rose-300 focus:border-rose-500 focus:ring-rose-500/15"
                    : "border-zinc-200 focus:border-[#1e794e] focus:ring-[#1e794e]/15"
                }`}
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                placeholder="••••••"
                minLength={6}
                required
              />
              {passwordConfirm && password !== passwordConfirm && (
                <p className="text-[11px] text-rose-600 mt-1">비밀번호가 일치하지 않습니다.</p>
              )}
            </div>

            {error && (
              <div className="text-sm rounded-md p-3 bg-rose-50 text-rose-700 border border-rose-200">
                {error}
              </div>
            )}
            {msg && (
              <div className="text-sm rounded-md p-3 bg-emerald-50 text-emerald-700 border border-emerald-200">
                {msg}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-50 transition hover:brightness-105 active:translate-y-px"
              style={{
                background: "linear-gradient(135deg, #1e794e 0%, #2a9162 100%)",
                boxShadow: "0 4px 12px rgba(30, 121, 78, 0.32)",
              }}
            >
              {loading ? "처리 중..." : "비밀번호 변경"}
            </button>
          </form>
        )}

        {hasSession === null && (
          <p className="mt-8 text-sm text-zinc-500 text-center">확인 중...</p>
        )}
      </div>
    </div>
  );
}
