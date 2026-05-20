import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "./PrintButton";

type SnapshotItem = {
  name: string;
  unit: string | null;
  value: number | string | null;
  icon: string | null;
};
type Snapshot = {
  student: {
    id: string;
    name: string | null;
    gender: string | null;
    birth: string | null;
    school: string | null;
    grade: string | null;
  };
  measurement_month: string;
  report_type: string;
  sections: { title: string; items: SnapshotItem[] }[];
};

function ageFromBirth(b: string | null) {
  if (!b) return null;
  const d = new Date(b);
  if (isNaN(d.getTime())) return null;
  const n = new Date();
  let age = n.getFullYear() - d.getFullYear();
  const m = n.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && n.getDate() < d.getDate())) age -= 1;
  return age;
}

export default async function ReportPreviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: r } = await supabase
    .from("reports")
    .select(
      "id, report_month, report_type, status, snapshot, coach_comment, admin_comment, published_at, public_to_parent",
    )
    .eq("id", id)
    .single();
  if (!r) notFound();

  const snap = (r.snapshot ?? null) as Snapshot | null;
  const student = snap?.student;
  const age = ageFromBirth(student?.birth ?? null);

  return (
    <>
      <style>{`
        @media print {
          .admin-shell .sidebar,
          .admin-shell .topbar,
          .admin-shell .workspace-strip,
          .no-print { display: none !important; }
          .admin-shell .main,
          .admin-shell .content,
          .admin-shell .panel { padding: 0; margin: 0; box-shadow: none; border: none; background: #fff; }
          .admin-shell, body, html { background: #fff !important; }
        }
        .report-print { background: #fff; max-width: 820px; margin: 0 auto; padding: 28px 32px; color: #222; }
        .report-print .cover { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #222; padding-bottom: 14px; margin-bottom: 18px; }
        .report-print .cover h1 { font-size: 26px; margin: 0; letter-spacing: -0.5px; }
        .report-print .cover .sub { font-size: 12px; color: #777; }
        .report-print .meta { font-size: 12px; min-width: 260px; }
        .report-print .meta div { display: flex; justify-content: space-between; padding: 3px 0; }
        .report-print .meta strong { font-weight: 700; }
        .report-print h2 { font-size: 15px; margin: 18px 0 6px; padding-left: 8px; border-left: 4px solid #222; }
        .report-print table { width: 100%; border-collapse: collapse; font-size: 13px; }
        .report-print th, .report-print td { border-bottom: 1px solid #eee; padding: 8px 10px; text-align: left; }
        .report-print th { background: #f7f7f7; font-weight: 700; }
        .report-print .empty { color: #999; font-size: 12px; padding: 8px; }
        .report-print .comment { background: #f7f7f7; border-radius: 6px; padding: 10px 12px; margin-top: 6px; font-size: 13px; white-space: pre-wrap; }
        .report-print .footer { margin-top: 24px; padding-top: 12px; border-top: 1px dashed #ccc; font-size: 11px; color: #888; }
      `}</style>

      <div
        className="toolbar no-print"
        style={{ justifyContent: "flex-end", marginBottom: 12 }}
      >
        <PrintButton />
      </div>

      <div className="report-print">
        <div className="cover">
          <div>
            <div className="sub">플랜비와 함께하는</div>
            <h1>
              {r.report_type}
              {r.report_type === "신체성장" ? " 기록" : " 리포트"}
            </h1>
            <div className="sub">땀으로 만든 변화, 데이터로 보는 성장</div>
          </div>
          <div className="meta">
            <div>
              <span>학생</span>
              <strong>
                {student?.name ?? "-"}
                {age != null ? ` / ${age}세` : ""}
                {student?.gender ? ` / ${student.gender}` : ""}
              </strong>
            </div>
            <div>
              <span>학교/학년</span>
              <strong>
                {student?.school ?? "-"}
                {student?.grade ? ` · ${student.grade}` : ""}
              </strong>
            </div>
            <div>
              <span>측정월</span>
              <strong>{r.report_month}</strong>
            </div>
            <div>
              <span>발행 상태</span>
              <strong>
                {r.status}
                {r.published_at
                  ? ` · ${r.published_at.slice(0, 10)}`
                  : ""}
              </strong>
            </div>
          </div>
        </div>

        {snap && snap.sections.length > 0 ? (
          snap.sections.map((sec) => (
            <section key={sec.title}>
              <h2>{sec.title}</h2>
              {sec.items.length === 0 ? (
                <div className="empty">측정값 없음</div>
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th style={{ width: "50%" }}>항목</th>
                      <th>측정값</th>
                      <th style={{ width: 80 }}>단위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sec.items.map((it) => (
                      <tr key={it.name}>
                        <td style={{ fontSize: 18, textAlign: "center" }}>
                          {it.icon ?? ""}
                        </td>
                        <td>{it.name}</td>
                        <td>
                          <strong>{it.value ?? "-"}</strong>
                        </td>
                        <td className="muted">{it.unit ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </section>
          ))
        ) : (
          <div className="empty">측정 데이터가 비어 있습니다. “측정값 재반영” 후 다시 시도하세요.</div>
        )}

        {(r.coach_comment || r.admin_comment) && (
          <section>
            <h2>코멘트</h2>
            {r.coach_comment && (
              <>
                <div className="sub" style={{ fontSize: 12, marginTop: 8 }}>
                  코치
                </div>
                <div className="comment">{r.coach_comment}</div>
              </>
            )}
            {r.admin_comment && (
              <>
                <div className="sub" style={{ fontSize: 12, marginTop: 8 }}>
                  관리자
                </div>
                <div className="comment">{r.admin_comment}</div>
              </>
            )}
          </section>
        )}

        <div className="footer">
          이 리포트는 측정 승인 시점의 데이터를 기준으로 발행되었습니다 · 플랜비
        </div>
      </div>
    </>
  );
}
