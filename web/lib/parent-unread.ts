import { createClient } from "@/lib/supabase/server";

// 학부모 미열람 카운트 — 1:1 채팅 + 게시글 답변 unread 메시지 수.
// 본인 created_by inquiry 의 support_messages 중 sender='admin' 그리고
// inquiry_reads.last_read_at 이후 created_at 인 메시지를 unread 로 본다.
// inquiry_reads 가 없으면 모든 admin 메시지가 unread.
export async function fetchParentUnread(): Promise<{
  chat: number;
  post: number;
  total: number;
}> {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return { chat: 0, post: 0, total: 0 };
  const userId = session.user.id;

  const { data: inquiries } = await supabase
    .from("inquiries")
    .select("id, kind")
    .eq("created_by", userId)
    .in("kind", ["chat", "post"]);
  type IRow = { id: string; kind: string };
  const inqRows = (inquiries ?? []) as IRow[];
  if (inqRows.length === 0) return { chat: 0, post: 0, total: 0 };

  const inquiryIds = inqRows.map((r) => r.id);

  // 본인이 가진 inquiry_reads
  const { data: reads } = await supabase
    .from("inquiry_reads")
    .select("inquiry_id, last_read_at")
    .eq("user_id", userId)
    .in("inquiry_id", inquiryIds);
  type RRow = { inquiry_id: string; last_read_at: string | null };
  const readMap = new Map<string, string>();
  for (const r of (reads ?? []) as RRow[]) {
    if (r.last_read_at) readMap.set(r.inquiry_id, r.last_read_at);
  }

  // 본인 inquiry 의 admin/hq 메시지 (sender != 'customer')
  const { data: msgs } = await supabase
    .from("support_messages")
    .select("inquiry_id, sender, created_at")
    .in("inquiry_id", inquiryIds)
    .neq("sender", "customer")
    .order("created_at", { ascending: false })
    .limit(500);
  type MRow = { inquiry_id: string; sender: string; created_at: string };
  const msgRows = (msgs ?? []) as MRow[];

  let chat = 0;
  let post = 0;
  const inqKindMap = new Map(inqRows.map((r) => [r.id, r.kind]));
  for (const m of msgRows) {
    const lastRead = readMap.get(m.inquiry_id);
    const isUnread = !lastRead || m.created_at > lastRead;
    if (!isUnread) continue;
    const kind = inqKindMap.get(m.inquiry_id);
    if (kind === "chat") chat++;
    else if (kind === "post") post++;
  }
  return { chat, post, total: chat + post };
}
