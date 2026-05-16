import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron 이 매일 호출. billing_day == 오늘인 센터의 확정 수강건을
// 청구서로 일괄 생성 (DB의 generate_due_invoices SECURITY DEFINER 함수).
// 보호: Vercel 이 CRON_SECRET 을 Authorization: Bearer 로 전달.
export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  if (
    process.env.CRON_SECRET &&
    auth !== `Bearer ${process.env.CRON_SECRET}`
  ) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase.rpc("generate_due_invoices");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    generated: data ?? 0,
    at: new Date().toISOString(),
  });
}
