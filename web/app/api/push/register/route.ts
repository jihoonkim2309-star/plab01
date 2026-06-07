import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// 클라이언트가 발급받은 FCM 토큰을 본인 계정에 저장 (device_tokens).
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { token?: string; platform?: string; userAgent?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const token = String(body.token ?? "").trim();
  if (!token) return NextResponse.json({ error: "no_token" }, { status: 400 });

  const { error } = await supabase
    .from("device_tokens")
    .upsert(
      {
        user_id: session.user.id,
        token,
        platform: body.platform || "web",
        user_agent: body.userAgent || null,
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: "token" },
    );
  if (error) {
    return NextResponse.json({ error: "save_failed", detail: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
