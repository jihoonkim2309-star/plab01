import { ArrowLeft, Bell, Calendar } from "lucide-react";
import { notFound } from "next/navigation";
import StudentTabbar from "../../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

type Notice = { id: string; title: string; body: string; published_at: string | null };

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

async function fetchDetail(id: string): Promise<Notice | null> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return { id: "mock", title: "이번 주 보강 안내", body: "수요일 16시 보강이 있습니다.", published_at: "2026-06-04T10:00:00" };
  const { supabase } = guard;
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, published_at")
    .eq("id", id)
    .not("published_at", "is", null)
    .maybeSingle();
  return (data as Notice | null) ?? null;
}

export default async function StudentNoticeDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const detail = await fetchDetail(id);
  if (!detail) notFound();
  return (
    <>
      <div className="portal-topbar">
        <a href="/student/notices" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>공지 상세</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 11, color: "#1e794e", fontWeight: 700, marginBottom: 8 }}>
            <span style={{ padding: "2px 8px", background: "var(--brand-soft, #d8ecdf)", borderRadius: 4 }}>지점</span>
          </div>
          <strong style={{ fontSize: 16, display: "block", lineHeight: 1.4 }}>{detail.title}</strong>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
            <Calendar size={12} />
            {fmtDateTime(detail.published_at)}
          </div>
        </section>

        <section className="card">
          <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.7, margin: 0 }}>
            {detail.body}
          </p>
        </section>
      </div>
      <StudentTabbar />
    </>
  );
}
