import { ArrowLeft, Bell, Paperclip, Send } from "lucide-react";

type Msg = { id: string; side: "me" | "them"; body: string; time: string };
const MOCK_MSGS: Msg[] = [
  { id: "m1", side: "them", body: "안녕하세요! 학부모님 무엇을 도와드릴까요?", time: "14:20" },
  { id: "m2", side: "me", body: "이번 주 보강 가능한지 문의드립니다", time: "14:22" },
  { id: "m3", side: "them", body: "네, 수요일 16시 보강 자리 있습니다. 진행해 드릴까요?", time: "14:25" },
  { id: "m4", side: "me", body: "네 부탁드립니다", time: "14:26" },
];

export default function ParentChat1on1() {
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
        {MOCK_MSGS.map((m) => {
          const me = m.side === "me";
          return (
            <div key={m.id} style={{ display: "flex", alignItems: "flex-end", gap: 6, alignSelf: me ? "flex-end" : "flex-start", flexDirection: me ? "row-reverse" : "row", maxWidth: "80%" }}>
              <div style={{
                padding: "8px 12px",
                borderRadius: 12,
                background: me ? "var(--brand-soft, #d8ecdf)" : "#fff",
                border: `1px solid ${me ? "#b8dccb" : "#e5e7eb"}`,
                fontSize: 13,
                lineHeight: 1.4,
                color: "#111",
                borderBottomRightRadius: me ? 4 : 12,
                borderBottomLeftRadius: me ? 12 : 4,
              }}>
                {m.body}
              </div>
              <div style={{ fontSize: 10, color: "#9ca3af", whiteSpace: "nowrap", paddingBottom: 2 }}>{m.time}</div>
            </div>
          );
        })}
      </div>

      <form style={{ display: "flex", gap: 8, padding: 10, borderTop: "1px solid #e5e7eb", background: "#fff", alignItems: "flex-end" }}>
        <button type="button" style={{ width: 36, height: 36, border: "1px solid #e5e7eb", background: "#fff", borderRadius: 8, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#6f7d78" }}>
          <Paperclip size={18} />
        </button>
        <textarea placeholder="메시지 입력" rows={1} style={{ flex: 1, padding: "8px 10px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "none" }} />
        <button type="submit" className="btn primary" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "8px 10px" }}>
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
