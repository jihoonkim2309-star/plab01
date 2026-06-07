import { getAdminMessaging, adminConfigured } from "@/lib/firebase/admin";

export type DispatchResult = {
  configured: boolean;
  notifications: number;
  sent: number;
  failed: number;
  pruned: number;
};

// 대기 중 push 알림을 FCM 으로 발송. cron / dispatch 엔드포인트 공용.
// pending_push_targets RPC(security definer)로 대상 토큰을 받아 멀티캐스트.
// Firebase 미설정이면 skip (큐 유지 → 키 설정 후 자동 발송).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function dispatchPendingPushes(supabase: any): Promise<DispatchResult> {
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

  const byNotif = new Map<
    string,
    { template: string; payload: Record<string, unknown>; tokens: string[] }
  >();
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
      res.responses.forEach((resp, i) => {
        if (
          !resp.success &&
          (resp.error?.code === "messaging/registration-token-not-registered" ||
            resp.error?.code === "messaging/invalid-registration-token")
        ) {
          supabase.rpc("prune_device_token", { p_token: g.tokens[i] });
          pruned++;
        }
      });
      const ok = res.successCount > 0;
      await supabase
        .from("notifications")
        .update({
          status: ok ? "성공" : "실패",
          provider: "fcm",
          sent_at: nowIso,
          error: ok ? null : "all_failed",
        })
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
