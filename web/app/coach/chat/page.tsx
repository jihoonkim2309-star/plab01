import { ArrowLeft, Bell, ChevronRight, MessageSquare } from "lucide-react";
import CoachTabbar from "../Tabbar";

const MOCK_THREADS = [
  { id: "t1", who: "박도윤 부", last: "이번 주 보강 가능한가요?", time: "10분 전", unread: 2 },
  { id: "t2", who: "강시우 모", last: "감사합니다!", time: "어제", unread: 0 },
];

export default function CoachChat() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>학부모 문의</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ padding: 0 }}>
          {MOCK_THREADS.map((t) => (
            <a key={t.id} href={`/coach/chat/${t.id}`} className="list-row" style={{ padding: "14px 16px" }}>
              <div className="avatar" style={{ width: 40, height: 40, fontSize: 14 }}>
                <MessageSquare size={18} />
              </div>
              <div style={{ flex: 1 }}>
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
      </div>
      <CoachTabbar />
    </>
  );
}
