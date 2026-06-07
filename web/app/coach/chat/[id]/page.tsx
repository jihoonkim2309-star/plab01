import { ArrowLeft, Bell } from "lucide-react";
import { notFound } from "next/navigation";
import { requirePortal } from "@/lib/portal-auth";
import { sendCoachChat } from "../actions";
import ChatComposer from "@/app/admin/ChatComposer";
import ChatScrollAnchor from "@/app/admin/ChatScrollAnchor";
import ChatBubble, { formatChatTime } from "@/app/admin/ChatBubble";
import RefreshOnce from "@/app/admin/RefreshOnce";
import ChatLive from "@/app/parent/chat/ChatLive";

export default async function CoachChatThread({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: inquiryId } = await params;
  const guard = await requirePortal("coach");
  if (guard.isEmbed) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f6f7f9" }}>
        <Header />
        <div className="portal-content">
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>로그인 후 이용해 주세요.</p>
          </section>
        </div>
      </div>
    );
  }
  const { supabase, userId } = guard;

  // RLS(inquiries_coach_read) — 스코프 밖이면 조회 안 됨 → 404
  const { data: inqRow } = await supabase
    .from("inquiries")
    .select("id, requester_name")
    .eq("id", inquiryId)
    .eq("kind", "chat")
    .maybeSingle();
  const inquiry = inqRow as { id: string; requester_name: string | null } | null;
  if (!inquiry) notFound();
  const who = inquiry.requester_name ?? "학부모";

  // 진입 시 자동 mark_read (멱등)
  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: inquiryId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  const { data: msgs } = await supabase
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true })
    .limit(500);
  const messages = (msgs ?? []) as { id: string; sender: string; body: string; created_at: string }[];

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f6f7f9" }}>
      <RefreshOnce k={inquiryId} />
      <ChatLive inquiryId={inquiryId} />
      <Header who={who} />

      <div className="chat-thread" style={{ flex: 1 }}>
        {messages.length === 0 ? (
          <div className="empty-state">
            <strong>아직 메시지가 없습니다</strong>
            <p>아래 입력창에 첫 답장을 보내 보세요.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isCoach = m.sender === "admin";
            return (
              <ChatBubble
                key={m.id}
                side={isCoach ? "me" : "them"}
                label={isCoach ? undefined : who}
                time={formatChatTime(m.created_at)}
                body={m.body}
                attachments={[]}
              />
            );
          })
        )}
        <ChatScrollAnchor k={`${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
      </div>

      <form action={sendCoachChat} data-no-loading="true" className="chat-input-form">
        <input type="hidden" name="inquiry_id" value={inquiryId} />
        <ChatComposer placeholder="학부모에게 보낼 답장 (Enter = 전송, Shift+Enter = 줄바꿈)" />
        <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>
          전송
        </button>
      </form>
    </div>
  );
}

function Header({ who }: { who?: string }) {
  return (
    <div className="portal-topbar">
      <a href="/coach/chat" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
        <ArrowLeft size={18} /> 뒤로
      </a>
      <h1 style={{ flex: 1, textAlign: "center" }}>{who ?? "학부모 문의"}</h1>
      <Bell size={20} />
    </div>
  );
}
