import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Vercel Cron 매일 호출:
// 1) generate_due_invoices — 지점 결제일(billing_day) 일치 → 학생 수강료 청구
// 2) generate_due_hq_invoices — 본사 청구일(hq_billing_day) 일치 → 지점 사용료 청구
// 3) generate_due_renewals — 지점 수강 확인일(renewal_check_day) 일치 → 다음달 renewal 행 생성 + 학부모 알림 큐잉
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

  const [studentDue, hqDue, renewalDue] = await Promise.all([
    supabase.rpc("generate_due_invoices"),
    supabase.rpc("generate_due_hq_invoices"),
    supabase.rpc("generate_due_renewals"),
  ]);

  if (studentDue.error || hqDue.error || renewalDue.error) {
    return NextResponse.json(
      {
        error: {
          student: studentDue.error?.message ?? null,
          hq: hqDue.error?.message ?? null,
          renewal: renewalDue.error?.message ?? null,
        },
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    student_invoices: studentDue.data ?? 0,
    hq_invoices: hqDue.data ?? 0,
    renewal_notifications: renewalDue.data ?? 0,
    at: new Date().toISOString(),
  });
}
