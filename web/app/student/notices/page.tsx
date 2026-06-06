import { ArrowLeft, Bell, ChevronRight } from "lucide-react";
import StudentTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

type Notice = { id: string; title: string; source: string; time: string; unread: boolean };

const MOCK: Notice[] = [
  { id: "n1", title: "이번 주 보강 안내", source: "지점", time: "2시간 전", unread: true },
];

function relativeTime(iso: string | null): string {
  if (!iso) return "";
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

async function fetchNotices(): Promise<Notice[]> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return MOCK;
  const { supabase } = guard;
  const { data } = await supabase
    .from("announcements")
    .select("id, title, published_at")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(50);
  type R = { id: string; title: string; published_at: string | null };
  return ((data ?? []) as R[]).map((n) => ({
    id: n.id,
    title: n.title,
    source: "지점",
    time: relativeTime(n.published_at),
    unread: false,
  }));
}

export default async function StudentNotices() {
  const notices = await fetchNotices();
  return (
    <>
      <div className="portal-topbar">
        <a href="/student" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>알림</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {notices.length === 0 ? (
          <section className="card">
            <div style={{ textAlign: "center", padding: "24px 0", color: "#6f7d78", fontSize: 13 }}>
              아직 받은 알림이 없습니다.
            </div>
          </section>
        ) : (
          <section className="card">
            {notices.map((n) => (
              <a key={n.id} href={`/student/notices/${n.id}`} className="notice-row">
                <div style={{ flex: 1 }}>
                  <div className="notice-title">
                    <span style={{ fontSize: 10, fontWeight: 800, color: "var(--brand)", marginRight: 6, padding: "1px 6px", background: "var(--brand-soft)", borderRadius: 4 }}>
                      {n.source}
                    </span>
                    {n.title}
                  </div>
                  <div className="notice-time">{n.time}</div>
                </div>
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
