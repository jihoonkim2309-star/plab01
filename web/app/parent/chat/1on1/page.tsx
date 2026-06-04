import { ArrowLeft, Bell, Send } from "lucide-react";
import { requirePortal } from "@/lib/portal-auth";
import { sendParentChat } from "../actions";

type Msg = { id: string; sender: string; body: string; created_at: string };

const MOCK_MSGS: Msg[] = [
  { id: "m1", sender: "admin", body: "안녕하세요! 학부모님 무엇을 도와드릴까요?", created_at: "2026-06-03T14:20:00" },
  { id: "m2", sender: "customer", body: "이번 주 보강 가능한지 문의드립니다", created_at: "2026-06-03T14:22:00" },
  { id: "m3", sender: "admin", body: "네, 수요일 16시 보강 자리 있습니다. 진행해 드릴까요?", created_at: "2026-06-03T14:25:00" },
];

async function fetchOrCreateChat(): Promise<{ messages: Msg[]; inquiryId: string | null }> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return { messages: MOCK_MSGS, inquiryId: "mock" };
  const { supabase, userId, centerId } = guard;
  if (!centerId) return { messages: [], inquiryId: null };

  // 기존 chat inquiry 찾기 (kind='chat', 학부모 = parent_id 같은 row)
  // inquiries 에는 parent_id 컬럼이 없음. requester 식별을 위해 user_metadata 또는 별도 추적 필요.
  // 단순화: 학부모 자녀 student_id → inquiries (kind='chat', requester_name=학부모이름?) — 의미 약함.
  //
  // 임시: 학부모 자녀 1명의 student 의 center 의 'chat' 중 학부모 본인 발신 메시지가 있는 첫 inquiry 사용.
  // 정식 구현은 inquiries 에 parent_id 컬럼 추가 권장 — 다음 phase.
  const { data: profile } = await supabase
    .from("users")
    .select("name")
    .eq("id", userId)
    .single();
  const parentName = (profile as { name?: string } | null)?.name ?? null;

  const { data: existing } = await supabase
    .from("inquiries")
    .select("id")
    .eq("center_id", centerId)
    .eq("kind", "chat")
    .eq("requester_name", parentName ?? "")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  let inquiryId = (existing as { id: string } | null)?.id ?? null;

  if (!inquiryId) {
    const { data: created } = await supabase
      .from("inquiries")
      .insert({
        center_id: centerId,
        kind: "chat",
        channel: "앱",
        subject: "1:1 채팅",
        body: "",
        requester_name: parentName,
        status: "접수",
      })
      .select("id")
      .single();
    inquiryId = (created as { id: string } | null)?.id ?? null;
  }

  if (!inquiryId) return { messages: [], inquiryId: null };

  const { data: msgs } = await supabase
    .from("support_messages")
    .select("id, sender, body, created_at")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true })
    .limit(500);

  return { messages: (msgs ?? []) as Msg[], inquiryId };
}

export default async function ParentChat1on1() {
  const { messages, inquiryId } = await fetchOrCreateChat();

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "#f6f7f9" }}>
      <div className="portal-topbar">
        <a href="/parent/chat" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>지점 채팅</h1>
        <Bell size={20} />
      </div>

      <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
        {messages.length === 0 ? (
          <p style={{ fontSize: 12, color: "#9ca3af", textAlign: "center", marginTop: 40 }}>
            첫 메시지를 보내 보세요.
          </p>
        ) : (
          messages.map((m) => {
            const me = m.sender === "customer" || m.sender === "parent";
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "flex-end", gap: 6, alignSelf: me ? "flex-end" : "flex-start", flexDirection: me ? "row-reverse" : "row", maxWidth: "80%" }}>
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
          })
        )}
      </div>

      {inquiryId && inquiryId !== "mock" && (
        <form action={sendParentChat} style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e7eb", background: "#fff", alignItems: "flex-end" }}>
          <input type="hidden" name="inquiry_id" value={inquiryId} />
          <textarea name="body" placeholder="메시지 입력" rows={1} required style={{ flex: 1, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "none" }} />
          <button type="submit" className="btn primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 10px" }}>
            <Send size={16} />
          </button>
        </form>
      )}
    </div>
  );
}
