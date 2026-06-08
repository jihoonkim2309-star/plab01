import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";

// 플로팅 채팅 위젯 — 이용자(학부모/학생) 1:1 채팅 대화 목록.
// inquiries.kind='chat' + 마지막 메시지 + 미열람 여부.
export async function GET() {
  const { supabase, centerId: cid, userId } = await requireCenter();

  const [listRes, readsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, requester_name, status, created_at, created_by")
      .eq("center_id", cid)
      .eq("kind", "chat")
      .order("created_at", { ascending: false }),
    supabase
      .from("inquiry_reads")
      .select("inquiry_id, last_read_at")
      .eq("user_id", userId),
  ]);

  const list = (listRes.data ?? []) as {
    id: string;
    requester_name: string | null;
    status: string;
    created_at: string;
    created_by: string | null;
  }[];

  // 작성자(학부모/학생) 역할 — created_by → users.role
  const creatorIds = [...new Set(list.map((i) => i.created_by).filter(Boolean))] as string[];
  const roleMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: us } = await supabase
      .from("users")
      .select("id, role")
      .in("id", creatorIds);
    for (const u of (us ?? []) as { id: string; role: string | null }[]) {
      if (u.role) roleMap.set(u.id, u.role);
    }
  }
  const roleLabel = (r: string | null) =>
    r === "parent" ? "학부모" : r === "student" ? "학생" : null;
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  // 마지막 메시지 (inquiry 별 최신 1건)
  const lastByInquiry: Record<
    string,
    { sender: string; body: string; created_at: string }
  > = {};
  if (list.length > 0) {
    const ids = list.map((i) => i.id);
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("inquiry_id, sender, body, created_at")
      .eq("center_id", cid)
      .in("inquiry_id", ids)
      .order("created_at", { ascending: false });
    for (const m of (msgs ?? []) as {
      inquiry_id: string;
      sender: string;
      body: string;
      created_at: string;
    }[]) {
      if (!lastByInquiry[m.inquiry_id])
        lastByInquiry[m.inquiry_id] = {
          sender: m.sender,
          body: m.body,
          created_at: m.created_at,
        };
    }
  }

  // 본사 채팅(branch_chat) 미열람 — 뱃지용 (열람 표시 안 함)
  let branchUnread = 0;
  const { data: branchInq } = await supabase
    .from("inquiries")
    .select("id")
    .eq("center_id", cid)
    .eq("kind", "branch_chat")
    .maybeSingle();
  if (branchInq) {
    const branchId = (branchInq as { id: string }).id;
    const [{ data: branchMsgs }, { data: branchRead }] = await Promise.all([
      supabase
        .from("support_messages")
        .select("created_at")
        .eq("center_id", cid)
        .eq("inquiry_id", branchId)
        .eq("sender", "hq"),
      supabase
        .from("inquiry_reads")
        .select("last_read_at")
        .eq("inquiry_id", branchId)
        .eq("user_id", userId)
        .maybeSingle(),
    ]);
    const lastRead = (branchRead as { last_read_at: string } | null)?.last_read_at ?? null;
    branchUnread = ((branchMsgs ?? []) as { created_at: string }[]).filter(
      (m) => !lastRead || lastRead < m.created_at,
    ).length;
  }

  let unreadTotal = 0;
  const conversationsAll = list.map((i) => {
    const lm = lastByInquiry[i.id] ?? null;
    const lastRead = readMap.get(i.id);
    const unread = !!lm && lm.sender === "customer" && (!lastRead || lastRead < lm.created_at);
    if (unread) unreadTotal++;
    return {
      id: i.id,
      name: i.requester_name ?? "고객",
      role: roleLabel(i.created_by ? roleMap.get(i.created_by) ?? null : null),
      status: i.status,
      lastBody: lm?.body ?? "",
      lastSender: lm?.sender ?? null,
      lastAt: lm?.created_at ?? i.created_at,
      unread,
    };
  });

  // 완료된 채팅은 숨김 (단, 새 미열람 메시지가 있으면 유지)
  const conversations = conversationsAll.filter((c) => c.status !== "완료" || c.unread);

  return NextResponse.json(
    { conversations, unreadTotal, branchUnread },
    { headers: { "Cache-Control": "no-store" } },
  );
}
