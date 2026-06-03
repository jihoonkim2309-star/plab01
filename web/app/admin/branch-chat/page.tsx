import { requireCenter } from "@/lib/center";
import ChatTextarea from "../ChatTextarea";
import RefreshOnce from "../RefreshOnce";
import ChatScrollAnchor from "../ChatScrollAnchor";
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

      <div className="panel" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 220px)" }}>
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 10,
            background: "var(--bg)",
          }}
        >
          {messages.length === 0 ? (
            <div className="empty-state">
              <strong>아직 메시지가 없습니다</strong>
              <p>아래 입력창에 첫 메시지를 보내보세요.</p>
            </div>
          ) : (
            messages.map((m) => {
              const isHq = m.sender === "hq";
              return (
                <div
                  key={m.id}
                  style={{
                    padding: 10,
                    borderRadius: 10,
                    background: isHq ? "var(--blue-soft)" : "var(--brand-soft)",
                    border: `1px solid ${isHq ? "#b8d0ee" : "#b8dccb"}`,
                    alignSelf: isHq ? "flex-start" : "flex-end",
                    maxWidth: "70%",
                  }}
                >
                  <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
                    {isHq ? "본사" : "우리 지점"} ·{" "}
                    {m.created_at.slice(0, 16).replace("T", " ")}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                    {m.body}
                  </div>
                </div>
              );
            })
          )}
          <ChatScrollAnchor k={`${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
        </div>
        <form
          action={sendBranchChatAsAdmin}
          data-no-loading="true"
          style={{
            display: "flex",
            gap: 8,
            padding: 12,
            borderTop: "1px solid var(--line)",
            background: "var(--panel)",
          }}
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
