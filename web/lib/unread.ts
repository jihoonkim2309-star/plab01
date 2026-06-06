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

    // 본사 채팅 — branch_chat inquiry 의 안 읽은 메시지 1+ 건 = unread 1
    counts["branch-chat"] = await countBranchChannelUnread(supabase, {
      userId: args.userId,
      centerId: args.centerId,
      kind: "branch_chat",
    });

    // 본사에 문의 — branch_to_hq 중 안 읽은 메시지 있는 inquiry 수
    counts["branch-inquiries"] = await countBranchChannelUnread(supabase, {
      userId: args.userId,
      centerId: args.centerId,
      kind: "branch_to_hq",
    });

    // 학부모/학생 1:1 채팅 — chat inquiry 의 customer 메시지 중 본인 미열람
    counts["support-chats"] = await countSupportInquiryUnread(supabase, {
      userId: args.userId,
      centerId: args.centerId,
      kind: "chat",
    });

    // 학부모/학생 게시글 문의 — post inquiry 의 customer 메시지 중 본인 미열람
    counts["support-posts"] = await countSupportInquiryUnread(supabase, {
      userId: args.userId,
      centerId: args.centerId,
      kind: "post",
    });
  }

  // 본사 모드 (super_admin + 활성 지점 X) — 모든 지점이 본사에 보낸 메시지 카운트
  if (!args.centerId && args.role === "super_admin") {
    counts["hq-chat"] = await countHqChannelUnread(supabase, {
      userId: args.userId,
      kind: "branch_chat",
    });
    counts["hq-inquiries"] = await countHqChannelUnread(supabase, {
      userId: args.userId,
      kind: "branch_to_hq",
    });
  }

  return counts;
}

// 본사 측 (super_admin) — 모든 지점의 inquiries 중 sender 가 지점 (admin/coach)
// 발신인 메시지 가운데 본인 last_read_at 이후 것 카운트.
async function countHqChannelUnread(
  supabase: SupabaseClient,
  args: { userId: string; kind: "branch_chat" | "branch_to_hq" },
): Promise<number> {
  const { data: inqs } = await supabase
    .from("inquiries")
    .select("id")
    .eq("kind", args.kind);
  const list = (inqs ?? []) as { id: string }[];
  if (list.length === 0) return 0;
  const ids = list.map((i) => i.id);

  const [readsRes, msgsRes] = await Promise.all([
    supabase
      .from("inquiry_reads")
      .select("inquiry_id, last_read_at")
      .eq("user_id", args.userId)
      .in("inquiry_id", ids),
    supabase
      .from("support_messages")
      .select("inquiry_id, created_at, sender")
      .in("inquiry_id", ids)
      .neq("sender", "hq"),
  ]);

  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  let unread = 0;
  for (const m of (msgsRes.data ?? []) as {
    inquiry_id: string;
    created_at: string;
  }[]) {
    const lastRead = readMap.get(m.inquiry_id);
    if (!lastRead || lastRead < m.created_at) unread++;
  }
  return unread;
}

// 지점이 본사 채널 (branch_chat / branch_to_hq) 의 inquiry 안에서
// 본인이 안 읽은 "메시지 수" (카톡식). sender='hq' 만 카운트 (본인 발신은 제외).
async function countBranchChannelUnread(
  supabase: SupabaseClient,
  args: { userId: string; centerId: string; kind: "branch_chat" | "branch_to_hq" },
): Promise<number> {
  const { data: inqs } = await supabase
    .from("inquiries")
    .select("id")
    .eq("center_id", args.centerId)
    .eq("kind", args.kind);
  const list = (inqs ?? []) as { id: string }[];
  if (list.length === 0) return 0;
  const ids = list.map((i) => i.id);

  const [readsRes, msgsRes] = await Promise.all([
    supabase
      .from("inquiry_reads")
      .select("inquiry_id, last_read_at")
      .eq("user_id", args.userId)
      .in("inquiry_id", ids),
    supabase
      .from("support_messages")
      .select("inquiry_id, created_at")
      .in("inquiry_id", ids)
      .eq("sender", "hq"),
  ]);

  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  let unread = 0;
  for (const m of (msgsRes.data ?? []) as {
    inquiry_id: string;
    created_at: string;
  }[]) {
    const lastRead = readMap.get(m.inquiry_id);
    if (!lastRead || lastRead < m.created_at) unread++;
  }
  return unread;
}

// 어드민이 학부모/학생 inquiry (kind='chat'/'post') 의 customer 메시지를
// 본인 last_read_at 이후 안 읽은 메시지 수 카운트 (카톡식 N건).
async function countSupportInquiryUnread(
  supabase: SupabaseClient,
  args: { userId: string; centerId: string; kind: "chat" | "post" },
): Promise<number> {
  const { data: inqs } = await supabase
    .from("inquiries")
    .select("id")
    .eq("center_id", args.centerId)
    .eq("kind", args.kind);
  const list = (inqs ?? []) as { id: string }[];
  if (list.length === 0) return 0;
  const ids = list.map((i) => i.id);

  const [readsRes, msgsRes] = await Promise.all([
    supabase
      .from("inquiry_reads")
      .select("inquiry_id, last_read_at")
      .eq("user_id", args.userId)
      .in("inquiry_id", ids),
    supabase
      .from("support_messages")
      .select("inquiry_id, created_at")
      .in("inquiry_id", ids)
      .eq("sender", "customer"),
  ]);

  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );
  let unread = 0;
  for (const m of (msgsRes.data ?? []) as { inquiry_id: string; created_at: string }[]) {
    const lastRead = readMap.get(m.inquiry_id);
    if (!lastRead || lastRead < m.created_at) unread++;
  }
  return unread;
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
