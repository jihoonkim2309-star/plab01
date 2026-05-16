import { bulkSetLinkStatus } from "./links-actions";

const SB: Record<string, string> = {
  pending: "orange",
  linked: "green",
  rejected: "gray",
};
const LABEL: Record<string, string> = {
  pending: "승인 대기",
  linked: "연결 완료",
  rejected: "반려",
};

export type LinkRow = {
  id: string;
  status: string;
  studentName: string | null;
  whoName: string | null;
  whoSub: string | null;
};

export default function LinksView({
  title,
  subtitle,
  table,
  whoLabel,
  rows,
}: {
  title: string;
  subtitle: string;
  table: string;
  whoLabel: string;
  rows: LinkRow[];
}) {
  const c = (s: string) => rows.filter((r) => r.status === s).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="subtext">{subtitle}</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{rows.length}</strong></div>
        <div className="summary-card"><span>승인 대기</span><strong>{c("pending")}</strong></div>
        <div className="summary-card"><span>연결 완료</span><strong>{c("linked")}</strong></div>
        <div className="summary-card"><span>반려</span><strong>{c("rejected")}</strong></div>
        <div className="summary-card"><span>처리율</span><strong>
          {rows.length ? Math.round(((c("linked") + c("rejected")) / rows.length) * 100) : 0}%
        </strong></div>
      </div>

      <form action={bulkSetLinkStatus} className="panel elevated">
        <input type="hidden" name="table" value={table} />
        <div className="panel-head">
          <p className="panel-title">연결 요청 목록</p>
          <div className="toolbar">
            <button className="btn primary" name="status" value="linked">
              선택 승인
            </button>
            <button className="btn warn" name="status" value="rejected">
              선택 반려
            </button>
            <button className="btn" name="status" value="pending">
              대기로 되돌리기
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th className="check-cell"></th>
              <th>학생</th>
              <th>{whoLabel}</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="check-cell">
                  <input type="checkbox" name="ids" value={r.id} />
                </td>
                <td>
                  <strong>{r.studentName ?? "-"}</strong>
                </td>
                <td>
                  {r.whoName ?? "-"}
                  {r.whoSub && <div className="muted">{r.whoSub}</div>}
                </td>
                <td>
                  <span className={`badge ${SB[r.status] ?? "gray"}`}>
                    {LABEL[r.status] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <strong>연결 요청이 없습니다</strong>
                    <p>
                      {whoLabel} 본인이 앱/포털에서 가입 후 연결을 요청하면 여기
                      표시됩니다. (포털 단계에서 유입 연결)
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </form>
    </>
  );
}
