import { ArrowLeft, Bell, FileText, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { notFound } from "next/navigation";
import StudentTabbar from "../../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import type { Snapshot, SnapshotSection, SnapshotTrendItem, TrendCell } from "@/app/admin/reports/snapshot";

type Report = {
  id: string;
  student_id: string;
  report_month: string;
  report_type: string;
  status: string;
  snapshot: Snapshot | null;
  coach_comment: string | null;
  admin_comment: string | null;
  published_at: string | null;
  studentName: string;
};

function fmtCell(v: TrendCell): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "number") {
    return Number.isInteger(v) ? v.toString() : v.toFixed(1);
  }
  return String(v);
}

async function fetchDetail(id: string): Promise<Report | null> {
  const guard = await requirePortal("student");
  if (guard.isEmbed) return null;
  const { supabase } = guard;
  const { data } = await supabase
    .from("reports")
    .select(
      "id, student_id, report_month, report_type, status, snapshot, coach_comment, admin_comment, published_at, students(name)",
    )
    .eq("id", id)
    .eq("status", "발행완료")
    .eq("public_to_parent", true)
    .maybeSingle();
  type R = Omit<Report, "studentName"> & { students: { name: string } | null };
  const r = data as R | null;
  if (!r) return null;

  return {
    id: r.id,
    student_id: r.student_id,
    report_month: r.report_month,
    report_type: r.report_type,
    status: r.status,
    snapshot: r.snapshot,
    coach_comment: r.coach_comment,
    admin_comment: r.admin_comment,
    published_at: r.published_at,
    studentName: r.students?.name ?? "",
  };
}

function ChangeBadge({ item }: { item: SnapshotTrendItem }) {
  if (item.change_abs === null) {
    return (
      <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color: "#9ca3af" }}>
        <Minus size={10} /> —
      </span>
    );
  }
  const up = item.change_abs > 0;
  const down = item.change_abs < 0;
  const Icon = up ? TrendingUp : down ? TrendingDown : Minus;
  const color = up ? "#1e794e" : down ? "#b42318" : "#6b7280";
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 2, fontSize: 10, color, fontWeight: 700 }}>
      <Icon size={10} />
      {up ? "+" : ""}{item.change_abs.toFixed(1)}
      {item.unit ? item.unit : ""}
    </span>
  );
}

function SectionCard({ section, months }: { section: SnapshotSection; months: [string, string, string, string] }) {
  if (section.items.length === 0) return null;
  return (
    <section className="card">
      <strong style={{ display: "block", fontSize: 14, marginBottom: 10 }}>{section.title}</strong>
      <div style={{ overflowX: "auto", margin: "0 -16px", padding: "0 16px" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
              <th style={{ textAlign: "left", padding: "8px 4px", color: "#6f7d78", fontWeight: 600 }}>항목</th>
              {months.map((m) => (
                <th key={m} style={{ textAlign: "right", padding: "8px 4px", color: "#6f7d78", fontWeight: 600, minWidth: 50 }}>
                  {m.slice(2).replace("-", ".")}
                </th>
              ))}
              <th style={{ textAlign: "right", padding: "8px 4px", color: "#6f7d78", fontWeight: 600, minWidth: 60 }}>변화</th>
            </tr>
          </thead>
          <tbody>
            {section.items.map((it, i) => (
              <tr key={i} style={{ borderBottom: "1px solid #f4f6f5" }}>
                <td style={{ padding: "10px 4px", fontWeight: 500 }}>
                  {it.name}
                  {it.unit && <span style={{ color: "#9ca3af", marginLeft: 4, fontWeight: 400 }}>({it.unit})</span>}
                </td>
                {it.values.map((v, j) => (
                  <td key={j} style={{ padding: "10px 4px", textAlign: "right", fontWeight: j === 3 ? 700 : 400, color: j === 3 ? "#1e794e" : "#374151" }}>
                    {fmtCell(v)}
                  </td>
                ))}
                <td style={{ padding: "10px 4px", textAlign: "right" }}>
                  <ChangeBadge item={it} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default async function ParentReportDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const r = await fetchDetail(id);
  if (!r) notFound();
  const snap = r.snapshot;

  return (
    <>
      <div className="portal-topbar">
        <a href="/student/reports" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>리포트 상세</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 48, height: 48, borderRadius: 10, background: "var(--brand-soft, #d8ecdf)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <FileText size={24} color="#1e794e" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, color: "#1e794e", fontWeight: 700, marginBottom: 2 }}>
              {r.report_month.replace("-", ".")} · {r.report_type}
            </div>
            <strong style={{ fontSize: 15 }}>{r.studentName}</strong>
            <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>
              {r.published_at ? r.published_at.slice(0, 10).replace(/-/g, ".") + " 발행" : ""}
            </div>
          </div>
        </section>

        {!snap ? (
          <section className="card">
            <p style={{ fontSize: 13, color: "#6f7d78", textAlign: "center", padding: "20px 0" }}>
              리포트 데이터를 불러올 수 없습니다.
            </p>
          </section>
        ) : (
          <>
            {snap.balance && (
              <section className="card">
                <strong style={{ display: "block", fontSize: 14, marginBottom: 12 }}>밸런스 점수</strong>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {(Object.entries(snap.balance) as [string, number][]).map(([k, v]) => (
                    <div key={k} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 11, color: "#6f7d78" }}>{k}</div>
                        <div style={{ height: 6, background: "#f1f5f4", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
                          <div style={{ width: `${Math.min(100, Math.max(0, v))}%`, height: "100%", background: "var(--brand, #1e794e)" }} />
                        </div>
                      </div>
                      <strong style={{ fontSize: 14, color: "var(--brand)", minWidth: 28, textAlign: "right" }}>{Math.round(v)}</strong>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {(snap.sections ?? []).map((sec) => (
              <SectionCard key={sec.category} section={sec} months={snap.months} />
            ))}

            {!snap.balance && (snap.sections ?? []).length === 0 && (
              <section className="card">
                <p style={{ fontSize: 13, color: "#6f7d78", textAlign: "center", padding: "20px 0" }}>
                  측정 데이터가 아직 없습니다.
                </p>
              </section>
            )}

            {(r.coach_comment || r.admin_comment) && (
              <section className="card">
                <strong style={{ display: "block", fontSize: 14, marginBottom: 10 }}>코멘트</strong>
                {r.coach_comment && (
                  <div style={{ marginBottom: 10 }}>
                    <div style={{ fontSize: 11, color: "#1e794e", fontWeight: 700, marginBottom: 4 }}>코치</div>
                    <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
                      {r.coach_comment}
                    </p>
                  </div>
                )}
                {r.admin_comment && (
                  <div>
                    <div style={{ fontSize: 11, color: "#6f7d78", fontWeight: 700, marginBottom: 4 }}>지점</div>
                    <p style={{ fontSize: 13, color: "#374151", whiteSpace: "pre-wrap", lineHeight: 1.6, margin: 0 }}>
                      {r.admin_comment}
                    </p>
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>
      <StudentTabbar />
    </>
  );
}
