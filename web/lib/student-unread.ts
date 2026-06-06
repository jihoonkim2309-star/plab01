import { createClient } from "@/lib/supabase/server";

// 학생 미열람 카운트 — 본인 inquiry (chat/post) 의 admin 메시지 중 last_read_at 이후.
export async function fetchStudentUnread(): Promise<{ chat: number; post: number; total: number }> {
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
