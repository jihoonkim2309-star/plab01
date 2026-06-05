import { requireCenter } from "@/lib/center";
import ChatComposer from "../ChatComposer";
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
        .select(
          "id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)",
        )
        .eq("inquiry_id", inquiryId)
        .order("created_at", { ascending: true })
        .limit(500)
    : { data: [] };

  type RawAtt = {
    id: string;
    storage_path: string;
    file_name: string;
    mime_type: string | null;
    size_bytes: number | null;
  };
  type RawMsg = {
    id: string;
    sender: string;
    body: string;
    created_at: string;
    support_message_attachments: RawAtt[] | null;
  };
  const rawMessages = (msgs ?? []) as unknown as RawMsg[];

  // 첨부 signed URL 일괄 생성 (1시간)
  const paths = rawMessages.flatMap((m) =>
    (m.support_message_attachments ?? []).map((a) => a.storage_path),
  );
  const urlMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from("chat-attachments")
      .createSignedUrls(paths, 3600);
    for (const s of (signed ?? []) as { path: string | null; signedUrl: string }[]) {
      if (s.path && s.signedUrl) urlMap.set(s.path, s.signedUrl);
    }
  }

  const messages = rawMessages.map((m) => ({
    id: m.id,
    sender: m.sender,
    body: m.body,
    created_at: m.created_at,
    attachments: (m.support_message_attachments ?? []).map((a) => ({
      id: a.id,
      fileName: a.file_name,
      mimeType: a.mime_type,
      sizeBytes: a.size_bytes,
      url: urlMap.get(a.storage_path) ?? "",
    })),
  }));

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
                attachments={m.attachments}
              />
            ))
          )}
          <ChatScrollAnchor k={`${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
        </div>
        <form
          action={sendBranchChatAsAdmin}
          data-no-loading="true"
          className="chat-input-form"
          encType="multipart/form-data"
        >
          <ChatComposer
            placeholder="본사에 보낼 메시지 (Enter = 전송, Shift+Enter = 줄바꿈)"
          />
          <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>
            전송
          </button>
        </form>
      </div>
    </>
  );
}
