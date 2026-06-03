import { requireCenter } from "@/lib/center";
import ChatTextarea from "../ChatTextarea";
import RefreshOnce from "../RefreshOnce";
import ChatScrollAnchor from "../ChatScrollAnchor";
import ChatBubble, { formatChatTime } from "../ChatBubble";
import { sendBranchChatAsAdmin } from "./actions";

export default async function BranchChatPage() {
  const { supabase, centerId, userId } = await requireCenter();

  // 자기 지점 branch_chat inquiry 가 있으면 그 id 로 메시지 조회. 없으면 빈 채팅.
  const { data: inq } = await supabase
    .from("inquiries")
    .select("id")
    .eq("center_id", centerId)
    .eq("kind", "branch_chat")
    .maybeSingle();
  const inquiryId = (inq as { id: string } | null)?.id ?? null;

  // 진입 시 멱등 mark_read (last_read_at = now) — RLS 가 본인 행만 허용
  if (inquiryId) {
    await supabase
      .from("inquiry_reads")
      .upsert(
        { inquiry_id: inquiryId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "inquiry_id,user_id" },
      );
  }

  const { data: msgs } = inquiryId
    ? await supabase
        .from("support_messages")
        .select("id, sender, body, created_at")
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true })
        .limit(500)
    : { data: [] };

  const messages = (msgs ?? []) as unknown as {
    id: string;
    sender: string;
    body: string;
    created_at: string;
  }[];

  return (
    <>
      {inquiryId && <RefreshOnce k={inquiryId} />}
      <div className="page-head">
        <div>
          <h1>본사 채팅</h1>
          <p className="subtext">본사와의 1:1 실시간 메시지</p>
        </div>
      </div>

      <div className="panel chat-panel" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)" }}>
        <div className="chat-thread">
          {messages.length === 0 ? (
            <div className="empty-state">
              <strong>아직 메시지가 없습니다</strong>
              <p>아래 입력창에 첫 메시지를 보내보세요.</p>
            </div>
          ) : (
            messages.map((m) => (
              <ChatBubble
                key={m.id}
                side={m.sender === "hq" ? "them" : "me"}
                label={m.sender === "hq" ? "본사" : "우리 지점"}
                time={formatChatTime(m.created_at)}
                body={m.body}
              />
            ))
          )}
          <ChatScrollAnchor k={`${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
        </div>
        <form
          action={sendBranchChatAsAdmin}
          data-no-loading="true"
          className="chat-input-form"
        >
          <ChatTextarea
            placeholder="본사에 보낼 메시지를 입력하세요 (Enter = 전송, Shift+Enter = 줄바꿈)"
          />
          <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>
            전송
          </button>
        </form>
      </div>
    </>
  );
}
