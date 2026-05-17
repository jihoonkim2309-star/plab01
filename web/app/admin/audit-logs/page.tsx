import { createClient } from "@/lib/supabase/server";

export default async function AuditLogsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("audit_logs")
    .select("id, action, target_table, target_id, created_at, users(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  const list = (data ?? []) as unknown as {
    id: string;
    action: string;
    target_table: string | null;
    target_id: string | null;
    created_at: string;
    users: { name: string | null } | null;
  }[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>감사 로그</h1>
          <p className="subtext">관리자 주요 작업 기록 (변경 추적)</p>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">활동 내역</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>작업자</th>
              <th>작업</th>
              <th>대상</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="muted">
                  {a.created_at?.slice(0, 16).replace("T", " ")}
                </td>
                <td className="muted">{a.users?.name ?? "-"}</td>
                <td>
                  <strong>{a.action}</strong>
                </td>
                <td className="muted">
                  {a.target_table ?? "-"}
                  {a.target_id ? ` · ${a.target_id.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    <strong>감사 로그가 없습니다</strong>
                    <p>주요 작업 기록 구조가 준비되어 있습니다.</p>
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
