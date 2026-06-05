import { ArrowLeft, Bell, Send } from "lucide-react";
import { notFound } from "next/navigation";
import PortalTabbar from "../../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";
import { sendParentPostReply } from "../../actions";

const STATUS_COLOR: Record<string, string> = {
  접수: "#d97706",
  처리중: "#2563eb",
  완료: "#1e794e",
};

type Msg = { id: string; sender: string; body: string; created_at: string };
type Detail = {
  id: string;
  subject: string;
  body: string;
  status: string;
  created_at: string;
  messages: Msg[];
};

const MOCK_DETAIL: Detail = {
  id: "mock",
  subject: "셔틀 노선 변경 가능한가요?",
  body: "현재 서부 노선 이용 중인데 동부 노선으로 변경 가능한지 문의드립니다.",
  status: "처리중",
  created_at: "2026-06-03T14:00:00",
  messages: [
    { id: "m1", sender: "admin", body: "안녕하세요! 가능합니다. 자녀 성함 알려주세요.", created_at: "2026-06-03T14:30:00" },
    { id: "m2", sender: "customer", body: "박도윤입니다.", created_at: "2026-06-03T15:00:00" },
  ],
};

async function fetchDetail(id: string): Promise<Detail | null> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK_DETAIL;
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

  const { data: msgs } = await supabase
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("inquiry_id", id)
    .order("created_at", { ascending: true })
    .limit(500);

  return {
    id: inqRow.id,
    subject: inqRow.subject,
    body: inqRow.body ?? "",
    status: inqRow.status,
    created_at: inqRow.created_at,
    messages: (msgs ?? []) as Msg[],
  };
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
      <div className="portal-topbar">
        <a href="/parent/chat/post" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>문의 상세</h1>
        <Bell size={20} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        <section className="card">
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

        {detail.messages.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 12, color: "#6f7d78", paddingLeft: 4 }}>답변 / 추가 메시지</div>
            {detail.messages.map((m) => {
              const me = m.sender === "customer" || m.sender === "parent";
              return (
                <div key={m.id} style={{ display: "flex", alignItems: "flex-end", gap: 6, alignSelf: me ? "flex-end" : "flex-start", flexDirection: me ? "row-reverse" : "row", maxWidth: "85%" }}>
                  <div style={{
                    padding: "8px 12px", borderRadius: 12,
                    background: me ? "var(--brand-soft, #d8ecdf)" : "#fff",
                    border: `1px solid ${me ? "#b8dccb" : "#e5e7eb"}`,
                    fontSize: 13, lineHeight: 1.4, color: "#111",
                    borderBottomRightRadius: me ? 4 : 12,
                    borderBottomLeftRadius: me ? 12 : 4,
                    whiteSpace: "pre-wrap",
                  }}>
                    {m.body}
                  </div>
                  <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", paddingBottom: 2 }}>
                    {m.created_at.slice(11, 16)}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {detail.id !== "mock" && (
        <form action={sendParentPostReply} style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e7eb", background: "#fff", alignItems: "flex-end" }}>
          <input type="hidden" name="inquiry_id" value={detail.id} />
          <textarea name="body" placeholder="추가 메시지 (선택)" rows={1} required style={{ flex: 1, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "none" }} />
          <button type="submit" className="btn primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 10px" }}>
            <Send size={16} />
          </button>
        </form>
      )}
      <PortalTabbar />
    </div>
  );
}
