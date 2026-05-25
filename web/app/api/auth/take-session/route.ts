// 로그인 직후 세션 발급 endpoint.
// GET  /api/auth/take-session         → 다른 곳 활성 세션 있나 확인
// POST /api/auth/take-session?force=1 → 새 session_id 발급 + DB 갱신 + cookie set (기존 세션 무효화)

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE, SESSION_TTL_MS, isActiveSession } from "@/lib/session";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("users")
    .select("current_session_id, last_seen_at")
    .eq("id", user.id)
    .single();

  const active = isActiveSession(profile?.last_seen_at) && !!profile?.current_session_id;
  return NextResponse.json({
    needs_confirm: active,
    last_seen_at: profile?.last_seen_at ?? null,
  });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const force = url.searchParams.get("force") === "1";

  // 활성 세션 있는데 force 안 주면 거부
  const { data: profile } = await supabase
    .from("users")
    .select("current_session_id, last_seen_at")
    .eq("id", user.id)
    .single();
  if (
    !force &&
    isActiveSession(profile?.last_seen_at) &&
    profile?.current_session_id
  ) {
    return NextResponse.json({ error: "active_elsewhere" }, { status: 409 });
  }

  // 새 session_id 발급
  const newSid = crypto.randomUUID();
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("users")
    .update({ current_session_id: newSid, last_seen_at: now })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, newSid, {
    path: "/",
    sameSite: "lax",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
  return res;
}
