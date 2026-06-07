import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { dispatchPendingPushes } from "@/lib/notifications";

// 대기 중 push 알림만 FCM 으로 발송 (cron 의 billing 등 부작용 없이).
// 보호: CRON_SECRET 설정 시 Bearer 필요. 미설정이면 개방(개발용).
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (process.env.CRON_SECRET && auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const result = await dispatchPendingPushes(supabase);
  return NextResponse.json({ ok: true, ...result, at: new Date().toISOString() });
}
