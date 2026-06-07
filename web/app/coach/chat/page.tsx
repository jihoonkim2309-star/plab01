import { ArrowLeft, Bell, MessageSquare, ChevronRight } from "lucide-react";
import CoachTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { formatChatTime } from "@/app/admin/ChatBubble";

type Thread = {
  id: string;
  who: string;
  last: string;
  time: string;
  unread: number;
};

export default async function CoachChat() {
  const guard = await requirePortal("coach");
  if (guard.isEmbed) {
    return (
      <>
        <Header />
        <div className="portal-content">
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>로그인 후 이용해 주세요.</p>
          </section>
        </div>
        <CoachTabbar />
      </>
    );
  }
  const { supabase, userId } = guard;

  // RLS(inquiries_coach_read) 로 본인 담당 클래스 학부모의 chat inquiry 만 조회
  const { data: inqRows } = await supabase
    .from("inquiries")
    .select("id, requester_name, created_at")
    .eq("kind", "chat")
    .order("created_at", { ascending: false });
  const inquiries = (inqRows ?? []) as { id: string; requester_name: string | null; created_at: string }[];

  let threads: Thread[] = [];
  if (inquiries.length > 0) {
    const ids = inquiries.map((i) => i.id);
    const [msgRes, readRes] = await Promise.all([
      supabase
        .from("support_messages")
        .select("inquiry_id, sender, body, created_at")
        .in("inquiry_id", ids)
        .order("created_at", { ascending: true }),
      supabase
        .from("inquiry_reads")
        .select("inquiry_id, last_read_at")
        .eq("user_id", userId)
        .in("inquiry_id", ids),
    ]);
    const msgs = (msgRes.data ?? []) as { inquiry_id: string; sender: string; body: string; created_at: string }[];
    const readAt = new Map(((readRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map((r) => [r.inquiry_id, r.last_read_at]));

    const lastByInq = new Map<string, { body: string; created_at: string }>();
    const unreadByInq = new Map<string, number>();
    for (const m of msgs) {
      lastByInq.set(m.inquiry_id, { body: m.body, created_at: m.created_at });
      if (m.sender === "customer") {
        const r = readAt.get(m.inquiry_id);
        if (!r || m.created_at > r) {
          unreadByInq.set(m.inquiry_id, (unreadByInq.get(m.inquiry_id) ?? 0) + 1);
        }
      }
    }

    threads = inquiries
      .filter((i) => lastByInq.has(i.id))
      .map((i) => {
        const last = lastByInq.get(i.id)!;
        return {
          id: i.id,
          who: i.requester_name ?? "학부모",
          last: last.body || "(첨부)",
          time: formatChatTime(last.created_at),
          unread: unreadByInq.get(i.id) ?? 0,
        };
      });
  }

  return (
    <>
      <Header />
      <div className="portal-content">
        {threads.length === 0 ? (
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>받은 문의가 없습니다.</p>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {threads.map((t) => (
              <a key={t.id} href={`/coach/chat/${t.id}`} className="list-row" style={{ padding: "14px 16px" }}>
                <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                  <MessageSquare size={18} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-row-title">{t.who}</div>
                  <div className="list-row-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.last}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 10, color: "#9ca3af" }}>{t.time}</div>
                  {t.unread > 0 && (
                    <span style={{ display: "inline-block", marginTop: 4, background: "#e53935", color: "#fff", fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 8 }}>
                      {t.unread}
                    </span>
                  )}
                </div>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))}
          </section>
        )}
      </div>
      <CoachTabbar />
    </>
  );
}

function Header() {
  return (
    <div className="portal-topbar">
      <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
        <ArrowLeft size={18} /> 뒤로
      </a>
      <h1 style={{ flex: 1, textAlign: "center" }}>학부모 문의</h1>
      <Bell size={20} />
    </div>
  );
}
