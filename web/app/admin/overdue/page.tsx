import { createClient } from "@/lib/supabase/server";
import { bulkOverdueAction } from "./actions";

function daysOver(due: string | null): number {
  if (!due) return 0;
  const d = new Date(due + "T00:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}
function bucket(n: number) {
  if (n >= 30) return { label: "장기(30+)", cls: "red" };
  if (n >= 7) return { label: "D+7", cls: "red" };
  if (n >= 3) return { label: "D+3", cls: "orange" };
  if (n >= 1) return { label: "D+1", cls: "orange" };
  return { label: "당일", cls: "gray" };
}

export default async function OverduePage() {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data } = await supabase
    .from("invoices")
    .select("id, period, amount, status, due_date, students(name)")
    .in("status", ["청구", "실패"])
    .lt("due_date", today)
    .order("due_date", { ascending: true });

  const list = (data ?? []) as unknown as {
    id: string;
    period: string;
    amount: number;
    status: string;
    due_date: string | null;
    students: { name: string } | null;
  }[];

  const total = list.reduce((a, b) => a + Number(b.amount), 0);
  const cntBucket = (lbl: string) =>
    list.filter((i) => bucket(daysOver(i.due_date)).label === lbl).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>미납 관리</h1>
          <p className="subtext">납기 경과 미수납 청구 — 재청구·알림·수납 처리</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>미납 건수</span><strong>{list.length}</strong></div>
        <div className="summary-card"><span>미납 총액</span><strong>{total.toLocaleString()}원</strong></div>
        <div className="summary-card"><span>D+3</span><strong>{cntBucket("D+3")}</strong></div>
        <div className="summary-card"><span>D+7</span><strong>{cntBucket("D+7")}</strong></div>
        <div className="summary-card"><span>장기(30+)</span><strong>{cntBucket("장기(30+)")}</strong></div>
      </div>

      <form action={bulkOverdueAction} className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">미납 목록</p>
          <div className="toolbar">
            <button className="btn" name="action" value="재청구">
              선택 재청구
            </button>
            <button className="btn warn" name="action" value="알림">
              선택 알림 발송
            </button>
            <button className="btn primary" name="action" value="결제완료">
              선택 수납완료
            </button>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th className="check-cell"></th>
              <th>학생</th>
              <th>청구월</th>
              <th>금액</th>
              <th>납기일</th>
              <th>경과</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => {
              const n = daysOver(i.due_date);
              const b = bucket(n);
              return (
                <tr key={i.id}>
                  <td className="check-cell">
                    <input type="checkbox" name="ids" value={i.id} />
                  </td>
                  <td>
                    <strong>{i.students?.name ?? "-"}</strong>
                  </td>
                  <td className="muted">{i.period}</td>
                  <td>{Number(i.amount).toLocaleString()}원</td>
                  <td className="muted">{i.due_date ?? "-"}</td>
                  <td>
                    <span className={`badge ${b.cls}`}>
                      {b.label} ({n}일)
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${i.status === "실패" ? "red" : "orange"}`}
                    >
                      {i.status}
                    </span>
                  </td>
                </tr>
              );
            })}
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>미납 건이 없습니다</strong>
                    <p>납기를 지난 미수납 청구가 여기 표시됩니다.</p>
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
