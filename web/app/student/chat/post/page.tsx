import { ArrowLeft, Bell, Plus, ChevronRight } from "lucide-react";
import StudentTabbar from "../../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

const STATUS_COLOR: Record<string, string> = {
  접수: "#d97706",
  처리중: "#2563eb",
  완료: "#1e794e",
};

type Post = {
  id: string;
  title: string;
  status: string;
  time: string;
};

const MOCK_POSTS: Post[] = [
  { id: "p3", title: "이번 달 수강료 영수증 요청", status: "접수", time: "1시간 전" },
  { id: "p2", title: "셔틀 노선 변경 가능한가요?", status: "처리중", time: "어제" },
  { id: "p1", title: "5월 리포트 잘 받았습니다", status: "완료", time: "1주 전" },
];

function relativeTime(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "방금";
  if (min < 60) return `${min}분 전`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}시간 전`;
  const day = Math.floor(h / 24);
  if (day < 7) return `${day}일 전`;
  return d.toISOString().slice(0, 10);
}

async function fetchPosts(): Promise<Post[]> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return MOCK_POSTS;
  const { supabase, userId } = guard;
  const { data } = await supabase
    .from("inquiries")
    .select("id, subject, status, created_at")
    .eq("kind", "post")
    .eq("created_by", userId)
    .order("created_at", { ascending: false })
    .limit(50);
  type R = { id: string; subject: string; status: string; created_at: string };
  return ((data ?? []) as R[]).map((r) => ({
    id: r.id,
    title: r.subject,
    status: r.status,
    time: relativeTime(r.created_at),
  }));
}

export default async function ParentChatPost() {
  const posts = await fetchPosts();
  return (
    <>
      <div className="portal-topbar">
        <a href="/student/chat" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>문의 게시글</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <a href="/student/chat/post/new" className="card" style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--brand)", textDecoration: "none", fontWeight: 700, justifyContent: "center" }}>
          <Plus size={18} />
          새 문의 작성
        </a>

        {posts.length === 0 ? (
          <section className="card">
            <div style={{ textAlign: "center", padding: "24px 0", color: "#6f7d78", fontSize: 13 }}>
              아직 작성한 문의가 없습니다.
            </div>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {posts.map((p) => (
              <a key={p.id} href={`/student/chat/post/${p.id}`} className="list-row" style={{ padding: "14px 16px" }}>
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">{p.title}</div>
                  <div className="list-row-sub">{p.time}</div>
                </div>
                <span style={{ fontSize: 10, fontWeight: 800, color: STATUS_COLOR[p.status] ?? "#6f7d78", padding: "2px 8px", background: "#fafafa", border: "1px solid #e5e7eb", borderRadius: 6 }}>
                  {p.status}
                </span>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))}
          </section>
        )}
      </div>
      <StudentTabbar />
    </>
  );
}
