// 핵심 server action 의 변경을 audit_logs 에 기록하는 헬퍼.
// 실패해도 본 액션을 막지 않도록 throw 하지 않음 (silent best-effort).
// 사용: await logAudit(supabase, { center_id, action: "hq_invoice.create", target_table: "hq_invoices", target_id, detail: {...} });

import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditArgs = {
  center_id: string;
  action: string;
  target_table?: string | null;
  target_id?: string | null;
  detail?: Record<string, unknown> | null;
};

export async function logAudit(
  supabase: SupabaseClient,
  args: AuditArgs,
): Promise<void> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("audit_logs").insert({
      center_id: args.center_id,
      actor: user?.id ?? null,
      action: args.action,
      target_table: args.target_table ?? null,
      target_id: args.target_id ?? null,
      detail: args.detail ?? null,
    });
  } catch {
    // audit 실패는 무시 (main action 보호)
  }
}
