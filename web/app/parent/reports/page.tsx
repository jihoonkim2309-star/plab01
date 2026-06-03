import { ArrowLeft, Bell, ChevronRight, FileText } from "lucide-react";
import PortalTabbar from "../PortalTabbar";

const MOCK_REPORTS = [
  { id: "r3", month: "2026.05", title: "5월 측정 리포트", issuedAt: "2026-06-01", thumb: "📊" },
  { id: "r2", month: "2026.04", title: "4월 측정 리포트", issuedAt: "2026-05-01", thumb: "📊" },
  { id: "r1", month: "2026.03", title: "3월 측정 리포트", issuedAt: "2026-04-01", thumb: "📊" },
];

export default function ParentReports() {
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
        {MOCK_REPORTS.map((r) => (
          <a key={r.id} href={`/parent/reports/${r.id}`} className="card" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#111" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--brand-soft, #d8ecdf)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
              <FileText size={22} color="#1e794e" />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 14 }}>{r.title}</strong>
              <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>{r.issuedAt} 발행</div>
            </div>
            <ChevronRight size={16} color="#9ca3af" />
          </a>
        ))}
      </div>
      <PortalTabbar />
    </>
  );
}
