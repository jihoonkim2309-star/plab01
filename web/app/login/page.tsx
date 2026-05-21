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
      window.location.assign("/admin");
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
    <div className="min-h-screen flex bg-zinc-50">
      {/* Left visual — md 이상에서 노출 (좁은 비주얼 영역) */}
      <div
        className="hidden md:flex md:w-2/5 lg:w-1/3 relative overflow-hidden items-center justify-center"
        style={{ background: "linear-gradient(135deg, #155a39 0%, #1e794e 100%)" }}
      >
        {/* 부드러운 데코 블롭 (은은하게) */}
        <div
          className="absolute top-[-100px] left-[-100px] w-[360px] h-[360px] rounded-full"
          style={{ background: "rgba(255,255,255,0.08)", filter: "blur(60px)" }}
        />
        <div
          className="absolute bottom-[-100px] right-[-100px] w-[360px] h-[360px] rounded-full"
          style={{ background: "rgba(255,255,255,0.08)", filter: "blur(60px)" }}
        />

        {/* 큰 로고 + 한 줄 슬로건 */}
        <div className="relative z-10 text-center px-10">
          <div className="mb-8">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/planb-logo.svg"
              alt="PlanB"
              className="h-10 mx-auto"
              style={{ filter: "brightness(0) invert(1)" }}
            />
          </div>
          <p className="text-white/90 text-lg font-semibold tracking-tight">
            학원 운영, 한 화면에서.
          </p>
        </div>
      </div>

      {/* Right form (더 넓은 영역) */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          {/* 모바일 전용 로고 */}
          <div className="md:hidden flex justify-center mb-6">
            <span className="inline-flex items-center bg-[#1e794e] rounded-lg px-5 py-2.5 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/planb-logo.svg"
                alt="PlanB"
                className="h-5"
                style={{ filter: "brightness(0) invert(1)" }}
              />
            </span>
          </div>

          <h1 className="text-3xl font-extrabold text-zinc-900 tracking-tight">
            환영합니다 <span>👋</span>
          </h1>
          <p className="mt-2 text-zinc-500">
            {mode === "signin"
              ? "관리자 계정으로 로그인해 주세요."
              : "관리자 계정을 만들어 시작하세요."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-5">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">이름</label>
                <input
                  className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="홍길동"
                  required
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">이메일</label>
              <input
                type="email"
                className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">비밀번호</label>
              <input
                type="password"
                className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                minLength={6}
                required
              />
            </div>

            {msg && (
              <div className="text-sm rounded-md p-3 bg-rose-50 text-rose-700 border border-rose-200">
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
              {loading
                ? "처리 중..."
                : mode === "signin"
                  ? "로그인"
                  : "회원가입"}
            </button>
          </form>

          <button
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setMsg(null);
            }}
            className="mt-6 w-full text-sm text-zinc-500 hover:text-[#1e794e] transition"
          >
            {mode === "signin" ? (
              <>
                관리자 계정이 없으신가요?{" "}
                <span className="font-semibold text-[#1e794e]">회원가입</span>
              </>
            ) : (
              <>
                이미 계정이 있으신가요?{" "}
                <span className="font-semibold text-[#1e794e]">로그인</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
