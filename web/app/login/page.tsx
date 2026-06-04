"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";

const MSG_MAP: Record<string, string> = {
  ousted: "다른 곳에서 같은 계정으로 로그인되어 이 세션이 종료되었습니다.",
  inactive: "오랫동안 활동이 없어 자동 로그아웃되었습니다. 다시 로그인해 주세요.",
};

// 로그인 후 사용자의 role 에 따라 적합한 랜딩 경로 결정.
async function landingForCurrentUser(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return "/login";
  const { data } = await supabase
    .from("users")
    .select("role")
    .eq("id", session.user.id)
    .single();
  const role = (data as { role?: string } | null)?.role ?? null;
  if (role === "parent") return "/parent";
  if (role === "student") return "/student";
  if (role === "coach") return "/coach";
  if (role === "driver") return "/driver";
  return "/admin";
}

export default function LoginPage() {
  const supabase = createClient();

  const [mode, setMode] = useState<"signin" | "signup" | "reset">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [applyingCenter, setApplyingCenter] = useState("");
  const [applyingRole, setApplyingRole] = useState<"admin" | "coach" | "driver" | "">("");
  const [centers, setCenters] = useState<{ id: string; name: string }[]>([]);
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // 다른 곳 활성 세션 감지 시 confirm 모달 표시
  const [confirmTakeover, setConfirmTakeover] = useState(false);

  // 가입 모드 진입 시 지점 목록 로드 (anon RPC).
  useEffect(() => {
    if (mode !== "signup" || centers.length > 0) return;
    supabase.rpc("list_centers_for_signup").then(({ data, error }) => {
      if (!error && Array.isArray(data)) {
        setCenters(data as { id: string; name: string }[]);
      }
    });
  }, [mode, centers.length, supabase]);

  // URL ?msg= 으로 들어오면 안내 메시지 표시 (강제 로그아웃 등)
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const m = p.get("msg");
    if (m && MSG_MAP[m]) setMsg(MSG_MAP[m]);
  }, []);

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
      const check = await fetch("/api/auth/take-session").then((r) => r.json());
      if (check.needs_confirm) {
        setConfirmTakeover(true);
        setLoading(false);
        return;
      }
      await fetch("/api/auth/take-session?force=1", { method: "POST" });
      document.cookie = "active_center=; max-age=0; path=/";
      window.location.assign(await landingForCurrentUser(supabase));
    } else if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        setMsg("재설정 메일 발송 실패: " + error.message);
        setLoading(false);
        return;
      }
      setMsg("재설정 링크를 이메일로 보냈습니다. 메일함을 확인해 주세요.");
      setMode("signin");
      setLoading(false);
    } else {
      if (password !== passwordConfirm) {
        setMsg("비밀번호가 일치하지 않습니다.");
        setLoading(false);
        return;
      }
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            phone,
            applying_center_id: applyingCenter || null,
            applying_role: applyingRole || null,
          },
        },
      });
      if (error) {
        const m = (error.message || "").toLowerCase();
        let friendly: string;
        if (m.includes("already") || m.includes("registered") || m.includes("user already")) {
          friendly = "이미 가입된 이메일입니다. 로그인 또는 비밀번호 재설정을 이용하세요.";
        } else if (m.includes("password") && m.includes("short")) {
          friendly = "비밀번호가 너무 짧습니다 (최소 8자).";
        } else if (m.includes("invalid") && m.includes("email")) {
          friendly = "이메일 형식이 올바르지 않습니다.";
        } else if (m.includes("rate") || m.includes("too many")) {
          friendly = "잠시 후 다시 시도해 주세요 (요청이 너무 빈번합니다).";
        } else {
          friendly = "회원가입 실패: " + error.message;
        }
        setMsg(friendly);
        setLoading(false);
        return;
      }
      setMsg(
        "가입 신청이 접수되었습니다. 슈퍼 어드민의 승인 후 어드민 화면에 접근할 수 있습니다.",
      );
      setMode("signin");
      setLoading(false);
    }
  }

  async function onTakeoverConfirm() {
    setLoading(true);
    await fetch("/api/auth/take-session?force=1", { method: "POST" });
    document.cookie = "active_center=; max-age=0; path=/";
    window.location.assign(await landingForCurrentUser(supabase));
  }

  async function onTakeoverCancel() {
    setConfirmTakeover(false);
    await supabase.auth.signOut();
    setMsg("로그인이 취소되었습니다. 다른 곳의 세션을 먼저 종료한 후 다시 시도해 주세요.");
  }

  return (
    <div className="min-h-screen flex bg-zinc-50">
      {/* 다른 곳 활성 세션 takeover 모달 */}
      {confirmTakeover && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.45)",
            zIndex: 50,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
          }}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 14,
              padding: 24,
              maxWidth: 380,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
            }}
          >
            <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0 }}>
              다른 곳에서 접속 중입니다
            </h2>
            <p style={{ marginTop: 10, fontSize: 14, color: "#525252" }}>
              이 계정은 이미 다른 기기/브라우저에서 접속 중입니다.
              <br />
              <strong>그 세션을 종료하고 여기서 로그인할까요?</strong>
              <br />
              <span style={{ fontSize: 12, color: "#737373" }}>
                기존 접속자는 다음 페이지 이동 시 자동 로그아웃됩니다.
              </span>
            </p>
            <div style={{ display: "flex", gap: 8, marginTop: 18, justifyContent: "flex-end" }}>
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50"
                onClick={onTakeoverCancel}
                disabled={loading}
              >
                취소
              </button>
              <button
                type="button"
                className="rounded-md px-4 py-2 text-sm font-bold text-white"
                style={{
                  background: "linear-gradient(135deg, #1e794e 0%, #2a9162 100%)",
                  boxShadow: "0 4px 12px rgba(30,121,78,0.32)",
                }}
                onClick={onTakeoverConfirm}
                disabled={loading}
              >
                {loading ? "처리 중..." : "여기서 로그인"}
              </button>
            </div>
          </div>
        </div>
      )}
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
                <div className="text-zinc-500 text-xs font-semibold">이달 신규 가입</div>
                <div className="text-zinc-400 text-[10px] mt-0.5">New Enrollments</div>
                <div className="mt-3 flex items-end justify-between">
                  <div className="text-2xl font-extrabold text-zinc-900 tracking-tight">18명</div>
                  <div className="text-xs font-bold text-[#28c76f]">+24%</div>
                </div>
                <div className="mt-2 flex items-end gap-1 h-6">
                  <div className="flex-1 rounded-sm bg-[#28c76f]/30" style={{ height: "30%" }} />
                  <div className="flex-1 rounded-sm bg-[#28c76f]/50" style={{ height: "55%" }} />
                  <div className="flex-1 rounded-sm bg-[#28c76f]/70" style={{ height: "45%" }} />
                  <div className="flex-1 rounded-sm bg-[#28c76f]" style={{ height: "80%" }} />
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
            {mode === "reset" ? "비밀번호 찾기" : <>환영합니다 <span>👋</span></>}
          </h1>
          <p className="mt-2 text-sm text-zinc-500">
            {mode === "signin"
              ? "관리자 계정으로 로그인해 주세요."
              : mode === "signup"
                ? "관리자 계정을 만들어 시작하세요."
                : "가입 시 사용한 이메일로 재설정 링크를 보내드립니다."}
          </p>

          <form onSubmit={onSubmit} className="mt-8 space-y-4">
            {mode === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">이름</label>
                  <input
                    className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="홍길동"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">연락처</label>
                  <input
                    type="tel"
                    inputMode="numeric"
                    className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                    value={phone}
                    onChange={(e) => setPhone(formatPhone(e.target.value))}
                    placeholder={PHONE_PLACEHOLDER}
                    maxLength={13}
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">신청 지점</label>
                  <select
                    className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 bg-white focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                    value={applyingCenter}
                    onChange={(e) => setApplyingCenter(e.target.value)}
                    required
                  >
                    <option value="">지점을 선택하세요</option>
                    {centers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 mb-1.5">신청 역할</label>
                  <select
                    className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 bg-white focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                    value={applyingRole}
                    onChange={(e) =>
                      setApplyingRole(e.target.value as "admin" | "coach" | "driver" | "")
                    }
                    required
                  >
                    <option value="">역할을 선택하세요</option>
                    <option value="admin">지점장 (관리자)</option>
                    <option value="coach">코치</option>
                    <option value="driver">기사</option>
                  </select>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    지점장 신청은 슈퍼 어드민이, 코치·기사 신청은 해당 지점장이 승인합니다.
                  </p>
                </div>
              </>
            )}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 mb-1.5">이메일</label>
              <input
                type="email"
                className="w-full rounded-md border border-zinc-200 px-3 py-2.5 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:border-[#1e794e] focus:ring-2 focus:ring-[#1e794e]/15 transition"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            {mode !== "reset" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">비밀번호</label>
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
            )}
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-700 mb-1.5">비밀번호 확인</label>
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
            )}

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
                  : mode === "signup"
                    ? "회원가입"
                    : "재설정 링크 받기"}
            </button>
          </form>

          <div className="mt-6 flex flex-col items-center gap-2">
            {mode === "signin" && (
              <>
                <button
                  onClick={() => { setMode("reset"); setMsg(null); }}
                  className="text-sm text-zinc-500 hover:text-[#1e794e] transition"
                >
                  비밀번호를 잊으셨나요?{" "}
                  <span className="font-semibold text-[#1e794e]">재설정</span>
                </button>
                <a
                  href="/signup"
                  className="text-sm text-zinc-500 hover:text-[#1e794e] transition"
                >
                  계정이 없으신가요?{" "}
                  <span className="font-semibold text-[#1e794e]">회원가입</span>
                </a>
              </>
            )}
            {mode === "signup" && (
              <button
                onClick={() => { setMode("signin"); setMsg(null); }}
                className="text-sm text-zinc-500 hover:text-[#1e794e] transition"
              >
                이미 계정이 있으신가요?{" "}
                <span className="font-semibold text-[#1e794e]">로그인</span>
              </button>
            )}
            {mode === "reset" && (
              <button
                onClick={() => { setMode("signin"); setMsg(null); }}
                className="text-sm text-zinc-500 hover:text-[#1e794e] transition"
              >
                <span className="font-semibold text-[#1e794e]">← 로그인으로 돌아가기</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
