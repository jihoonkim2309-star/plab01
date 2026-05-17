import { createClient } from "@/lib/supabase/server";

const SB: Record<string, string> = {
  대기: "orange",
  성공: "green",
  실패: "red",
};

export default async function NotificationsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("id, kind, recipient, template, status, provider, error, created_at, sent_at")
    .order("created_at", { ascending: false })
    .limit(300);
  const list = data ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>알림 발송 로그</h1>
          <p className="subtext">앱 푸시(FCM) · 카카오 알림톡(Solapi) 발송 기록</p>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">발송 내역</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>종류</th>
              <th>수신</th>
              <th>템플릿</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td className="muted">
                  {n.created_at?.slice(0, 16).replace("T", " ")}
                </td>
                <td>
                  <span className="badge blue">{n.kind}</span>
                </td>
                <td className="muted">{n.recipient ?? "-"}</td>
                <td className="muted">{n.template ?? "-"}</td>
                <td>
                  <span className={`badge ${SB[n.status] ?? "gray"}`}>
                    {n.status}
                  </span>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    <strong>발송 로그가 없습니다</strong>
                    <p>
                      알림(FCM/알림톡) 연동 단계에서 발송 시 여기 기록됩니다.
                      구조·표시는 준비 완료.
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
