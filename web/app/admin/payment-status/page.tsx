import { createClient } from "@/lib/supabase/server";
import { setPaymentStatus } from "./actions";

const SB: Record<string, string> = {
  대기: "gray",
  청구: "orange",
  결제완료: "green",
  실패: "red",
  환불: "blue",
};
const STATUSES = ["대기", "청구", "결제완료", "실패", "환불"];

export default async function PaymentStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string }>;
}) {
  const { s } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("invoices")
    .select("id, period, amount, status, paid_at, due_date, students(name)")
    .order("created_at", { ascending: false })
    .limit(300);
  if (s && STATUSES.includes(s)) q = q.eq("status", s);
  const { data } = await q;
  const list = (data ?? []) as unknown as {
    id: string;
    period: string;
    amount: number;
    status: string;
    paid_at: string | null;
    due_date: string | null;
    students: { name: string } | null;
  }[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>결제 상태</h1>
          <p className="subtext">전체 청구·결제 내역 (입금 확인 후 수동 확정)</p>
        </div>
        <div className="toolbar">
          <a className="btn" href="/admin/payment-status">
            전체
          </a>
          {STATUSES.map((x) => (
            <a
              key={x}
              className={`btn${s === x ? " toggle-active" : ""}`}
              href={`/admin/payment-status?s=${encodeURIComponent(x)}`}
            >
              {x}
            </a>
          ))}
        </div>
      </div>

      <form action={setPaymentStatus} className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">내역 {s ? `· ${s}` : ""}</p>
          <div className="toolbar">
            <button className="btn primary" name="status" value="결제완료">
              선택 결제완료
            </button>
            <button className="btn warn" name="status" value="실패">
              선택 실패
            </button>
            <button className="btn" name="status" value="환불">
              선택 환불
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
              <th>납기</th>
              <th>상태</th>
              <th>결제일</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
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
                  <span className={`badge ${SB[i.status] ?? "gray"}`}>
                    {i.status}
                  </span>
                </td>
                <td className="muted">
                  {i.paid_at ? i.paid_at.slice(0, 10) : "-"}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>내역이 없습니다</strong>
                    <p>청구 관리에서 청구서를 생성하면 여기 표시됩니다.</p>
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
