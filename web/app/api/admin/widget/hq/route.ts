import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/center";

// 플로팅 위젯 (프랜차이즈 모드) — 본사 ↔ 각 지점 채팅 목록.
// 모든 지점 + 각 branch_chat 의 마지막 메시지 + 미열람(지점 발신=sender 'admin').
export async function GET() {
  const { supabase, userId } = await requireSuperAdmin();

  const [centersRes, chatsRes, readsRes] = await Promise.all([
    supabase.from("centers").select("id, name").order("name"),
    supabase.from("inquiries").select("id, center_id, status").eq("kind", "branch_chat"),
    supabase.from("inquiry_reads").select("inquiry_id, last_read_at").eq("user_id", userId),
  ]);

  const centers = (centersRes.data ?? []) as { id: string; name: string }[];
  const chats = (chatsRes.data ?? []) as { id: string; center_id: string; status: string }[];
  const chatByCenter = new Map(chats.map((c) => [c.center_id, c.id]));
  const statusByInquiry = new Map(chats.map((c) => [c.id, c.status]));
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  // 각 branch_chat inquiry 의 마지막 메시지
  const lastByInquiry: Record<string, { sender: string; body: string; created_at: string }> = {};
  const unreadByInquiry: Record<string, number> = {};
  const inquiryIds = chats.map((c) => c.id);
  if (inquiryIds.length > 0) {
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("inquiry_id, sender, body, created_at")
      .in("inquiry_id", inquiryIds)
      .order("created_at", { ascending: false });
    for (const m of (msgs ?? []) as {
      inquiry_id: string;
      sender: string;
      body: string;
      created_at: string;
    }[]) {
      if (!lastByInquiry[m.inquiry_id])
        lastByInquiry[m.inquiry_id] = { sender: m.sender, body: m.body, created_at: m.created_at };
      // 미열람 = 지점(admin) 발신, last_read 이후
      const lastRead = readMap.get(m.inquiry_id) ?? null;
      if (m.sender === "admin" && (!lastRead || lastRead < m.created_at)) {
        unreadByInquiry[m.inquiry_id] = (unreadByInquiry[m.inquiry_id] ?? 0) + 1;
      }
    }
  }

  let unreadTotal = 0;
  const conversations = centers
    .map((c) => {
      const inquiryId = chatByCenter.get(c.id) ?? null;
      const lm = inquiryId ? lastByInquiry[inquiryId] ?? null : null;
      const unread = inquiryId ? (unreadByInquiry[inquiryId] ?? 0) > 0 : false;
      const status = inquiryId ? statusByInquiry.get(inquiryId) ?? "접수" : "접수";
      if (unread) unreadTotal++;
      return {
        centerId: c.id,
        name: c.name,
        status,
        lastBody: lm?.body ?? "",
        lastSender: lm?.sender ?? null,
        lastAt: lm?.created_at ?? null,
        unread,
      };
    })
    // 진행 중(대화 있는) 지점만 — 대화 없음·완료 제외 (새 미열람은 유지).
    // 새 지점 채팅 시작은 전체 페이지(디렉토리)에서.
    .filter((c) => c.lastAt !== null && (c.status !== "완료" || c.unread));

  // 활동순 정렬 (최근 메시지 먼저, 없으면 이름순)
  conversations.sort((a, b) => {
    if (a.lastAt && b.lastAt) return b.lastAt.localeCompare(a.lastAt);
    if (a.lastAt) return -1;
    if (b.lastAt) return 1;
    return a.name.localeCompare(b.name);
  });

  return NextResponse.json(
    { conversations, unreadTotal },
    { headers: { "Cache-Control": "no-store" } },
  );
}
