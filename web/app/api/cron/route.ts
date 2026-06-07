import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { chargeWithBillingKey } from "@/lib/portone";
import { getAdminMessaging, adminConfigured } from "@/lib/firebase/admin";

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

// notifications 큐 발송 — kind='push', status='대기' 를 FCM 으로 전송.
// pending_push_targets RPC(security definer)로 대상 토큰을 받아 멀티캐스트.
// Firebase 미설정이면 skip (큐는 그대로 유지 → 키 설정 후 자동 발송).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processNotifications(
  supabase: any,
): Promise<{ configured: boolean; notifications: number; sent: number; failed: number; pruned: number }> {
  const messaging = getAdminMessaging();
  if (!messaging || !adminConfigured()) {
    return { configured: false, notifications: 0, sent: 0, failed: 0, pruned: 0 };
  }

  const { data: targets } = await supabase.rpc("pending_push_targets", { p_limit: 300 });
  const rows = (targets ?? []) as {
    notification_id: string;
    template: string | null;
    payload: Record<string, unknown> | null;
    token: string;
  }[];
  if (rows.length === 0) {
    return { configured: true, notifications: 0, sent: 0, failed: 0, pruned: 0 };
  }

  // notification 별로 토큰 묶기
  const byNotif = new Map<string, { template: string; payload: Record<string, unknown>; tokens: string[] }>();
  for (const r of rows) {
    let g = byNotif.get(r.notification_id);
    if (!g) {
      g = { template: r.template ?? "", payload: r.payload ?? {}, tokens: [] };
      byNotif.set(r.notification_id, g);
    }
    g.tokens.push(r.token);
  }

  let sent = 0;
  let failed = 0;
  let pruned = 0;
  const nowIso = new Date().toISOString();

  for (const [nid, g] of byNotif) {
    // data payload 는 문자열만 허용 → 문자열화
    const data: Record<string, string> = {};
    for (const [k, v] of Object.entries(g.payload)) {
      data[k] = typeof v === "string" ? v : JSON.stringify(v ?? "");
    }
    data.template = g.template;

    try {
      const res = await messaging.sendEachForMulticast({
        tokens: g.tokens,
        notification: { title: "플랜비", body: g.template || "새 알림" },
        data,
        webpush: { fcmOptions: { link: "/" } },
      });
      // 무효 토큰 정리
      res.responses.forEach((resp, i) => {
        if (!resp.success && resp.error?.code === "messaging/registration-token-not-registered") {
          supabase.rpc("prune_device_token", { p_token: g.tokens[i] });
          pruned++;
        }
      });
      const ok = res.successCount > 0;
      await supabase
        .from("notifications")
        .update({ status: ok ? "성공" : "실패", provider: "fcm", sent_at: nowIso, error: ok ? null : "all_failed" })
        .eq("id", nid);
      if (ok) sent++;
      else failed++;
    } catch (e) {
      await supabase
        .from("notifications")
        .update({ status: "실패", provider: "fcm", error: String(e).slice(0, 300) })
        .eq("id", nid);
      failed++;
    }
  }

  return { configured: true, notifications: byNotif.size, sent, failed, pruned };
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
