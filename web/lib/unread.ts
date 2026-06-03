// 사이드바·페이지에서 쓰는 미열람 카운트 계산.
// slug = nav.ts 의 NavItem.slug 값과 일치 — Sidebar 가 그대로 매핑.
//
// 1차 채널: 본사 공지 (inbound-notices).
//   - 자기 지점 대상 + 발행된 hq_notices 중 본인이 hq_notice_reads 에 없는 것.
// 다른 채널 (branch-chat / branch-inquiries / hq-chat / hq-inquiries) 는
// read 추적 스키마 도입 후 같은 패턴으로 이 객체에 추가만 하면 됨.

import type { SupabaseClient } from "@supabase/supabase-js";

export type UnreadCounts = Record<string, number>;

export async function getUnreadCounts(
  supabase: SupabaseClient,
  args: { userId: string; centerId: string | null; role: string | null },
): Promise<UnreadCounts> {
  const counts: UnreadCounts = {};

  // 지점 admin/coach 또는 활성 지점 컨텍스트의 super_admin 만 본사 공지 수신
  if (args.centerId && (args.role === "admin" || args.role === "coach" || args.role === "super_admin")) {
    counts["inbound-notices"] = await countInboundNoticesUnread(supabase, {
      userId: args.userId,
      centerId: args.centerId,
    });
  }

  return counts;
}

async function countInboundNoticesUnread(
  supabase: SupabaseClient,
  args: { userId: string; centerId: string },
): Promise<number> {
  // 1) 본인이 읽은 notice_id 목록
  const { data: reads } = await supabase
    .from("hq_notice_reads")
    .select("notice_id")
    .eq("user_id", args.userId);
  const readIds = new Set((reads ?? []).map((r) => r.notice_id as string));

  // 2) 발행된 공지 + scope/target 자체 필터 (super_admin 도 본점 컨텍스트면
  //    그 지점이 대상인 공지만 카운트하도록 RLS 와 별개로 명시 필터)
  const { data: notices } = await supabase
    .from("hq_notices")
    .select("id, scope, target_center_ids")
    .not("published_at", "is", null);

  type N = { id: string; scope: string; target_center_ids: string[] | null };
  const list = (notices ?? []) as N[];
  let unread = 0;
  for (const n of list) {
    const targeted =
      n.scope === "all" ||
      (n.scope === "centers" &&
        Array.isArray(n.target_center_ids) &&
        n.target_center_ids.includes(args.centerId));
    if (targeted && !readIds.has(n.id)) unread++;
  }
  return unread;
}
