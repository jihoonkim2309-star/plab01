import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { SESSION_COOKIE } from "@/lib/session";

// 로그아웃 — supabase signOut + users.current_session_id 클리어 + cookie 제거
export async function POST() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    await supabase
      .from("users")
      .update({ current_session_id: null })
      .eq("id", user.id);
  }
  await supabase.auth.signOut();
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
