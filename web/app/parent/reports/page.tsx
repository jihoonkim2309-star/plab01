import { ArrowLeft, Bell, ChevronRight, FileText } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

type Report = {
  id: string;
  month: string;
  title: string;
  issuedAt: string;
};

const MOCK: Report[] = [
  { id: "r3", month: "2026.05", title: "5월 측정 리포트", issuedAt: "2026-06-01" },
  { id: "r2", month: "2026.04", title: "4월 측정 리포트", issuedAt: "2026-05-01" },
  { id: "r1", month: "2026.03", title: "3월 측정 리포트", issuedAt: "2026-04-01" },
];

async function fetchReports(): Promise<Report[]> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK;
  const { supabase } = guard;
  const { data } = await supabase
    .from("reports")
    .select("id, report_month, report_type, published_at, students(name)")
    .eq("status", "발행완료")
    .eq("public_to_parent", true)
    .order("published_at", { ascending: false })
    .limit(50);
  type R = {
    id: string;
    report_month: string;
    report_type: string;
    published_at: string | null;
    students: { name: string } | null;
  };
  return ((data ?? []) as unknown as R[]).map((r) => {
    const m = r.report_month.replace("-", ".");
    const studentName = r.students?.name ?? "";
    const title = `${studentName ? studentName + " · " : ""}${r.report_type}`;
    return {
      id: r.id,
      month: m,
      title,
      issuedAt: r.published_at ? r.published_at.slice(0, 10) : "—",
    };
  });
}

export default async function ParentReports() {
  const reports = await fetchReports();
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>리포트</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>월간 측정 리포트 — 매월 발행</p>
        {reports.length === 0 ? (
          <section className="card">
            <div style={{ textAlign: "center", padding: "24px 0", color: "#6f7d78", fontSize: 13 }}>
              아직 발행된 리포트가 없습니다.
            </div>
          </section>
        ) : (
          reports.map((r) => (
            <a key={r.id} href={`/parent/reports/${r.id}`} className="card" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#111" }}>
              <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--brand-soft, #d8ecdf)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                <FileText size={22} color="#1e794e" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 11, color: "#1e794e", fontWeight: 700, marginBottom: 2 }}>{r.month}</div>
                <strong style={{ fontSize: 14 }}>{r.title}</strong>
                <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>{r.issuedAt} 발행</div>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </a>
          ))
        )}
      </div>
      <PortalTabbar />
    </>
  );
}
