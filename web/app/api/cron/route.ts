import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chargeWithBillingKey } from "@/lib/portone";

// Vercel Cron 매일 호출:
// 1) generate_due_invoices — 지점 결제일(billing_day) 일치 → 학생 수강료 청구
// 2) generate_due_hq_invoices — 본사 청구일(hq_billing_day) 일치 → 지점 사용료 청구
// 3) generate_due_renewals — 지점 수강 확인일(renewal_check_day) → 다음달 renewal + 알림
// 4) chargeUnpaidInvoices — 미납 invoices 의 학부모 빌링키로 자동 결제
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

  // 4) 자동 청구
  const billing = await chargeUnpaidInvoices(supabase);

  // 5) notifications 큐 발송 (현재는 mock — 실 FCM/Solapi 연동 시 교체)
  const notify = await processNotifications(supabase);

  if (studentDue.error || hqDue.error || renewalDue.error) {
    return NextResponse.json(
      {
        error: {
          student: studentDue.error?.message ?? null,
          hq: hqDue.error?.message ?? null,
          renewal: renewalDue.error?.message ?? null,
        },
        billing,
        notify,
      },
      { status: 500 },
    );
  }
  return NextResponse.json({
    ok: true,
    student_invoices: studentDue.data ?? 0,
    hq_invoices: hqDue.data ?? 0,
    renewal_notifications: renewalDue.data ?? 0,
    billing,
    notify,
    at: new Date().toISOString(),
  });
}

// notifications 큐 발송 — 'status'='대기' 인 행을 처리.
// 현재: 실 발송 (FCM/Solapi) 미구현, mock 으로 sent 마킹만.
// 실 발송 시: payload.target_user_id 의 사용자에게 push/알림톡 발송 후 sent.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processNotifications(supabase: any): Promise<{ pending: number; sent: number }> {
  const { data: pending } = await supabase
    .from("notifications")
    .select("id")
    .eq("status", "대기")
    .limit(500);
  const list = (pending ?? []) as { id: string }[];
  if (list.length === 0) return { pending: 0, sent: 0 };

  const ids = list.map((r) => r.id);
  const nowIso = new Date().toISOString();
  await supabase
    .from("notifications")
    .update({ status: "sent", sent_at: nowIso })
    .in("id", ids);

  return { pending: list.length, sent: list.length };
}

// 미납 invoices 에 대해 학부모 기본 빌링키로 결제 시도.
// 결과: payments insert + invoices.status 업데이트.
// supabase 의 generic 차이로 any 사용
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function chargeUnpaidInvoices(
  supabase: any,
): Promise<{ tried: number; success: number; failed: number; skipped: number }> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: invoices } = await supabase
    .from("invoices")
    .select("id, center_id, student_id, amount, due_date, status")
    .eq("status", "pending")
    .lte("due_date", today)
    .limit(200);

  const list = (invoices ?? []) as {
    id: string;
    center_id: string;
    student_id: string;
    amount: number;
    due_date: string;
    status: string;
  }[];

  let success = 0,
    failed = 0,
    skipped = 0;

  for (const inv of list) {
    // 학생 → 학부모 linked
    const { data: link } = await supabase
      .from("parent_student_links")
      .select("parent_id")
      .eq("student_id", inv.student_id)
      .eq("status", "linked")
      .limit(1)
      .maybeSingle();
    const parentId = (link as { parent_id?: string } | null)?.parent_id;
    if (!parentId) {
      skipped++;
      continue;
    }

    // 기본 빌링키
    const { data: card } = await supabase
      .from("billing_keys")
      .select("id, customer_uid")
      .eq("parent_id", parentId)
      .eq("is_default", true)
      .eq("status", "active")
      .maybeSingle();
    const billingKey = (card as { customer_uid?: string } | null)?.customer_uid;
    const billingKeyId = (card as { id?: string } | null)?.id;
    if (!billingKey) {
      skipped++;
      continue;
    }

    // 센터의 PG 키
    const { data: center } = await supabase
      .from("centers")
      .select("name, pg_api_secret")
      .eq("id", inv.center_id)
      .single();
    const c = (center as { name?: string; pg_api_secret?: string } | null) ?? {};
    if (!c.pg_api_secret) {
      skipped++;
      continue;
    }

    const result = await chargeWithBillingKey(c.pg_api_secret, {
      paymentId: inv.id,
      billingKey,
      amount: inv.amount,
      orderName: `${c.name ?? "수강료"} - ${inv.due_date.slice(0, 7)}`,
      customerId: parentId,
    });

    if (result.ok) {
      await supabase
        .from("invoices")
        .update({
          status: "paid",
          billing_key_id: billingKeyId,
          paid_at: new Date().toISOString(),
        })
        .eq("id", inv.id);
      await supabase.from("payments").insert({
        center_id: inv.center_id,
        invoice_id: inv.id,
        amount: inv.amount,
        status: "성공",
        provider: "portone",
        pg_tx_id: result.pgTxId ?? null,
        method: "card",
        paid_at: new Date().toISOString(),
      });
      success++;
    } else {
      await supabase.from("payments").insert({
        center_id: inv.center_id,
        invoice_id: inv.id,
        amount: inv.amount,
        status: "실패",
        provider: "portone",
        failed_reason: result.error ?? null,
      });
      failed++;
    }
  }

  return { tried: list.length, success, failed, skipped };
}
