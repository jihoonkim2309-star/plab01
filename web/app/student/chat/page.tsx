import { Bell, MessageSquare, FileText } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { fetchStudentUnread } from "@/lib/student-unread";

export default async function ParentChat() {
  const guard = await requirePortal("student");
  const unread = guard.isEmbed
    ? { chat: 0, post: 0, total: 0 }
    : await fetchStudentUnread();

  return (
    <>
      <div className="portal-topbar">
        <h1>문의</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <a href="/student/chat/post" className="card" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#111" }}>
          <FileText size={22} color="#1e794e" />
          <div style={{ flex: 1 }}>
            <strong>문의 게시글</strong>
            <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>
              정식 문의 — 제목·내용 작성 후 지점이 답변
            </div>
          </div>
          {unread.post > 0 && (
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: 10,
                background: "#b42318",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              {unread.post > 99 ? "99+" : unread.post}
            </span>
          )}
        </a>

        <a href="/student/chat/1on1" className="card" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#111" }}>
          <MessageSquare size={22} color="#1e794e" />
          <div style={{ flex: 1 }}>
            <strong>1:1 채팅</strong>
            <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>
              빠른 질의 — 지점과 실시간 카톡 스타일 대화
            </div>
          </div>
          {unread.chat > 0 && (
            <span
              style={{
                minWidth: 20,
                height: 20,
                padding: "0 6px",
                borderRadius: 10,
                background: "#b42318",
                color: "#fff",
                fontSize: 11,
                fontWeight: 800,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                boxSizing: "border-box",
              }}
            >
              {unread.chat > 99 ? "99+" : unread.chat}
            </span>
          )}
        </a>

        <div className="card" style={{ background: "#fafafa" }}>
          <strong style={{ fontSize: 13 }}>전화 / 방문 안내</strong>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6, lineHeight: 1.5 }}>
            급한 일은 지점 전화 또는 방문으로 문의해 주세요.
          </p>
        </div>
      </div>
      <StudentTabbar />
    </>
  );
}
