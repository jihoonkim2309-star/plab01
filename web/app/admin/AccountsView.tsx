export type AccountRow = {
  id: string;
  name: string | null;
  email: string | null;
  createdAt: string | null;
  extra?: string | null;
};

export default function AccountsView({
  title,
  subtitle,
  extraLabel,
  rows,
}: {
  title: string;
  subtitle: string;
  extraLabel?: string;
  rows: AccountRow[];
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="subtext">{subtitle}</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 계정</span>
          <strong>{rows.length}</strong>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">계정 목록</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              {extraLabel && <th>{extraLabel}</th>}
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name ?? "-"}</strong>
                </td>
                <td className="muted">{r.email ?? "-"}</td>
                {extraLabel && <td className="muted">{r.extra ?? "-"}</td>}
                <td className="muted">{r.createdAt?.slice(0, 10) ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={extraLabel ? 4 : 3}>
                  <div className="empty-state">
                    <strong>계정이 없습니다</strong>
                    <p>
                      해당 역할 사용자가 포털/앱에서 가입하면 여기 표시됩니다.
                      (포털 단계에서 유입)
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
