import { ArrowLeft, Bell } from "lucide-react";
import { requirePortal } from "@/lib/portal-auth";
import { sendStudentChat } from "../actions";
import ChatBubble, { formatChatTime } from "@/app/admin/ChatBubble";
import RefreshOnce from "@/app/admin/RefreshOnce";
import ChatLive from "../ChatLive";
import LiveChatThread from "@/app/LiveChatThread";

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

async function fetchOrCreateChat() {
  const guard = await requirePortal("student");
  if (guard.isEmbed) {
    return {
      messages: [
        { id: "m1", sender: "admin" as const, body: "안녕하세요! 학부모님 무엇을 도와드릴까요?", created_at: "2026-06-03T14:20:00", attachments: [] },
        { id: "m2", sender: "customer" as const, body: "이번 주 보강 가능한지 문의드립니다", created_at: "2026-06-03T14:22:00", attachments: [] },
        { id: "m3", sender: "admin" as const, body: "네, 수요일 16시 보강 자리 있습니다. 진행해 드릴까요?", created_at: "2026-06-03T14:25:00", attachments: [] },
      ],
      inquiryId: "mock",
      isEmbed: true as const,
      debugError: undefined,
    };
  }
  const { supabase, userId, centerId } = guard;
  if (!centerId) {
    return { messages: [], inquiryId: null, isEmbed: false as const, debugError: "지점 정보가 없습니다." };
  }

  const { data: existing } = await supabase
    .from("inquiries")
    .select("id")
    .eq("kind", "chat")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let inquiryId = (existing as { id: string } | null)?.id ?? null;

  let debugError: string | undefined;
  if (!inquiryId) {
    const { data: profile } = await supabase
      .from("users")
      .select("name")
      .eq("id", userId)
      .single();
    const parentName = (profile as { name?: string } | null)?.name ?? null;

    const { data: created, error: createErr } = await supabase
      .from("inquiries")
      .insert({
        center_id: centerId,
        kind: "chat",
        channel: "앱",
        subject: "1:1 채팅",
        body: "",
        requester_name: parentName,
        status: "접수",
        created_by: userId,
      })
      .select("id")
      .single();
    if (createErr) {
      debugError = `inquiry 생성 실패: ${createErr.message} (code: ${createErr.code ?? "?"})`;
    }
    inquiryId = (created as { id: string } | null)?.id ?? null;
  }

  if (!inquiryId) {
    return { messages: [], inquiryId: null, isEmbed: false as const, debugError };
  }

  // 진입 시 자동 mark_read (멱등 upsert)
  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: inquiryId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  const { data: msgs } = await supabase
    .from("support_messages")
    .select(
      "id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)",
    )
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true })
    .limit(500);
  const rawMessages = (msgs ?? []) as unknown as RawMsg[];

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

  return { messages, inquiryId, isEmbed: false as const, debugError };
}

export default async function ParentChat1on1() {
  const { messages, inquiryId, isEmbed, debugError } = await fetchOrCreateChat();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f6f7f9" }}>
      {inquiryId && !isEmbed && <RefreshOnce k={inquiryId} />}
      {inquiryId && !isEmbed && <ChatLive inquiryId={inquiryId} />}
      <div className="portal-topbar">
        <a href="/student/chat" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>지점 채팅</h1>
        <Bell size={20} />
      </div>

      {debugError && (
        <div style={{ padding: 12, background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, fontSize: 12, color: "#b42318", whiteSpace: "pre-wrap" }}>
          ⚠️ {debugError}
        </div>
      )}
      {inquiryId && !isEmbed ? (
        <LiveChatThread
          messages={messages}
          action={sendStudentChat}
          meSenders={["customer", "parent", "student"]}
          themLabel="지점"
          placeholder="지점에 보낼 메시지 (Enter = 전송, Shift+Enter = 줄바꿈)"
          hiddenFields={{ inquiry_id: inquiryId }}
        />
      ) : (
        <div className="chat-thread" style={{ flex: 1 }}>
          {messages.length === 0 ? (
            <div className="empty-state">
              <strong>아직 메시지가 없습니다</strong>
              <p>아래 입력창에 첫 메시지를 보내 보세요.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isCustomer = m.sender === "customer" || m.sender === "parent";
              return (
                <ChatBubble
                  key={m.id}
                  side={isCustomer ? "me" : "them"}
                  label={isCustomer ? undefined : "지점"}
                  time={formatChatTime(m.created_at)}
                  body={m.body}
                  attachments={m.attachments}
                />
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
