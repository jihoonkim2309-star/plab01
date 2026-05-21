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
      {/* Left visual — Vuexy 패턴: 플로팅 카드 + 중앙 일러스트 */}
      <div className="hidden md:flex md:w-3/5 lg:w-[58%] relative overflow-hidden items-center justify-center bg-[#f6faf8]">
        {/* 좌상단 작은 로고 — SVG 그대로, 박스 없음 */}
        <div className="absolute top-7 left-9 z-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" className="h-6" />
        </div>

        {/* 바닥 곡선 데코 (Vuexy 의 그 wave) */}
        <svg
          className="absolute bottom-0 left-0 w-full"
          viewBox="0 0 800 120"
          preserveAspectRatio="none"
          style={{ height: 120 }}
        >
          <path
            d="M0,40 Q200,0 400,30 T800,20 L800,120 L0,120 Z"
            fill="rgba(40,199,111,0.06)"
          />
          <path
            d="M0,70 Q200,40 400,60 T800,55 L800,120 L0,120 Z"
            fill="rgba(40,199,111,0.04)"
          />
        </svg>

        {/* 일러스트 + 카드를 하나의 비율 고정 컨테이너로 묶어 함께 스케일 */}
        <div className="relative z-10 flex items-center justify-center w-full h-full">
          {/* 후광 + 일러스트 + 카드 묶음.
              height = min(85vh, 50vw)
              · 작은(960×1100): min(942, 480) = 480 (vw 제약, 작은 화면 사이즈 유지)
              · 큰(2144×1108): min(942, 1072) = 942 (vh 제약, 65→85 로 30% 키움) */}
          <div
            className="relative"
            style={{
              height: "min(85vh, 50vw)",
              aspectRatio: "595 / 842",
            }}
          >
            {/* 후광 — 일러스트 뒤 부드러운 그린 글로우 */}
            <div
              className="absolute inset-0 -m-[30%] rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(40,199,111,0.18) 0%, rgba(40,199,111,0.06) 40%, transparent 70%)",
                filter: "blur(20px)",
              }}
            />

            {/* 일러스트 — 마스크로 가장자리 페이드 */}
            <div
              className="absolute inset-0"
              style={{
                WebkitMaskImage:
                  "radial-gradient(ellipse 70% 60% at center, black 55%, transparent 95%)",
                maskImage:
                  "radial-gradient(ellipse 70% 60% at center, black 55%, transparent 95%)",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/login-hero.svg"
                alt=""
                aria-hidden
                className="w-full h-full object-contain"
              />
            </div>

            {/* 카드 1 — 좌상, 캐릭터 왼쪽 옆 (네거티브 오프셋으로 캐릭터 밖) */}
            <div
              className="absolute z-20"
              style={{
                top: "18%",
                left: "-8%",
                transform:
                  "scale(calc(min(85vh, 50vw) / 600px))",
                transformOrigin: "top left",
              }}
            >
              <div className="bg-white rounded-2xl px-4 py-4 shadow-xl ring-1 ring-zinc-100 w-[160px]">
                <div className="text-zinc-500 text-xs font-semibold">이번 달 수강생</div>
                <div className="text-zinc-400 text-[10px] mt-0.5">Active Members</div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-2xl font-extrabold text-zinc-900 tracking-tight">247명</div>
                  <div className="text-xs font-bold text-[#28c76f]">+12%</div>
                </div>
                <svg className="mt-2 w-full" viewBox="0 0 100 24" height="24">
                  <path
                    d="M 0 18 L 12 15 L 24 17 L 36 11 L 48 13 L 60 7 L 72 10 L 84 5 L 100 4"
                    stroke="#1e794e"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                  />
                  <circle cx="100" cy="4" r="3" fill="#1e794e" />
                </svg>
              </div>
            </div>

            {/* 카드 2 — 우중, 캐릭터 오른쪽 옆 (네거티브 오프셋으로 캐릭터 밖) */}
            <div
              className="absolute z-20"
              style={{
                top: "45%",
                right: "-8%",
                transform:
                  "scale(calc(min(85vh, 50vw) / 600px))",
                transformOrigin: "top right",
              }}
            >
              <div className="bg-white rounded-2xl px-4 py-4 shadow-xl ring-1 ring-zinc-100 w-[160px]">
                <div className="text-zinc-500 text-xs font-semibold">이번 달 수납</div>
                <div className="text-zinc-400 text-[10px] mt-0.5">Monthly Revenue</div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-xl font-extrabold text-zinc-900 tracking-tight">₩ 4.2M</div>
                  <div className="text-xs font-bold text-[#28c76f]">+8%</div>
                </div>
                <div className="mt-2 flex items-end gap-1 h-6">
                  <div className="flex-1 rounded-sm bg-[#28c76f]/30" style={{ height: "40%" }} />
                  <div className="flex-1 rounded-sm bg-[#28c76f]/50" style={{ height: "60%" }} />
                  <div className="flex-1 rounded-sm bg-[#28c76f]/70" style={{ height: "50%" }} />
                  <div className="flex-1 rounded-sm bg-[#28c76f]" style={{ height: "85%" }} />
                  <div className="flex-1 rounded-sm bg-[#1e794e]" style={{ height: "100%" }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          {/* 모바일 전용 로고 — SVG 그대로, 박스 없음 */}
          <div className="md:hidden flex justify-center mb-7">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/planb-logo.svg" alt="PlanB" className="h-7" />
          </div>

          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">
            환영합니다 <span>👋</span>
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {mode === "signin"
              ? "관리자 계정으로 로그인해 주세요."
              : "관리자 계정을 만들어 시작하세요."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
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
