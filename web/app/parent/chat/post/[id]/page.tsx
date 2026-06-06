import { ArrowLeft, Bell } from "lucide-react";
import { notFound } from "next/navigation";
import PortalTabbar from "../../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";
import { sendParentPostReply } from "../../actions";
import ChatComposer from "@/app/admin/ChatComposer";
import ChatScrollAnchor from "@/app/admin/ChatScrollAnchor";
import ChatBubble, { formatChatTime } from "@/app/admin/ChatBubble";
import RefreshOnce from "@/app/admin/RefreshOnce";
import ChatLive from "../../ChatLive";

const STATUS_COLOR: Record<string, string> = {
  접수: "#d97706",
  처리중: "#2563eb",
  완료: "#1e794e",
};

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

async function fetchDetail(id: string) {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return null;
  const { supabase, userId } = guard;
  const { data: inq } = await supabase
    .from("inquiries")
    .select("id, subject, body, status, created_at")
    .eq("id", id)
    .eq("created_by", userId)
    .maybeSingle();
  type IR = { id: string; subject: string; body: string | null; status: string; created_at: string };
  const inqRow = inq as IR | null;
  if (!inqRow) return null;

  // 진입 시 자동 mark_read
  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: id, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  const { data: msgs } = await supabase
    .from("support_messages")
    .select(
      "id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)",
    )
    .eq("inquiry_id", id)
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

  return { ...inqRow, messages };
}

export default async function ParentChatPostDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await fetchDetail(id);
  if (!detail) notFound();
  const statusColor = STATUS_COLOR[detail.status] ?? "#6f7d78";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f6f7f9" }}>
      <RefreshOnce k={detail.id} />
      <ChatLive inquiryId={detail.id} />
      <div className="portal-topbar">
        <a href="/parent/chat/post" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>문의 상세</h1>
        <Bell size={20} />
      </div>

      <div className="chat-thread" style={{ flex: 1 }}>
        <section className="card" style={{ background: "#fff", padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 800, color: statusColor, padding: "2px 8px", background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 6 }}>
              {detail.status}
            </span>
            <span style={{ fontSize: 11, color: "#9ca3af" }}>
              {detail.created_at.slice(0, 10)}
            </span>
          </div>
          <strong style={{ fontSize: 15 }}>{detail.subject}</strong>
          {detail.body && (
            <p style={{ marginTop: 10, fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.55 }}>
              {detail.body}
            </p>
          )}
        </section>

        {detail.messages.length === 0 ? (
          <div className="empty-state">
            <strong>아직 답변이 없습니다</strong>
            <p>지점에서 답변을 남기면 여기에 표시됩니다.</p>
          </div>
        ) : (
          detail.messages.map((m) => {
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
        <ChatScrollAnchor k={`${detail.messages.length}-${detail.messages[detail.messages.length - 1]?.id ?? ""}`} />
      </div>

      <form
        action={sendParentPostReply}
        data-no-loading="true"
        className="chat-input-form"
      >
        <input type="hidden" name="inquiry_id" value={detail.id} />
        <ChatComposer placeholder="추가 메시지 (Enter = 전송, Shift+Enter = 줄바꿈)" />
        <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>
          전송
        </button>
      </form>
      <PortalTabbar />
    </div>
  );
}
