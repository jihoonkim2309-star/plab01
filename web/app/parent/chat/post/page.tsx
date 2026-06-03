import { ArrowLeft, Bell, Plus, ChevronRight } from "lucide-react";
import PortalTabbar from "../../PortalTabbar";

const STATUS_COLOR: Record<string, string> = {
  접수: "#d97706",
  처리중: "#2563eb",
  완료: "#1e794e",
};

const MOCK_POSTS = [
  { id: "p3", title: "이번 달 수강료 영수증 요청", status: "접수", time: "1시간 전" },
  { id: "p2", title: "셔틀 노선 변경 가능한가요?", status: "처리중", time: "어제" },
  { id: "p1", title: "5월 리포트 잘 받았습니다", status: "완료", time: "1주 전" },
];

export default function ParentChatPost() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/chat" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>문의 게시글</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <a href="/parent/chat/post/new" className="card" style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--brand)", textDecoration: "none", fontWeight: 700, justifyContent: "center" }}>
          <Plus size={18} />
          새 문의 작성
        </a>

        <section className="card" style={{ padding: 0 }}>
          {MOCK_POSTS.map((p) => (
            <a key={p.id} href={`/parent/chat/post/${p.id}`} className="list-row" style={{ padding: "14px 16px" }}>
              <div style={{ flex: 1 }}>
                <div className="list-row-title">{p.title}</div>
                <div className="list-row-sub">{p.time}</div>
              </div>
              <span style={{ fontSize: 10, fontWeight: 800, color: STATUS_COLOR[p.status], padding: "2px 8px", background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                {p.status}
              </span>
              <ChevronRight size={14} color="#9ca3af" />
            </a>
          ))}
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
