import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CheckRowToggle from "../CheckRowToggle";
import {
  generateInvoices,
  bulkInvoiceStatus,
  seedDummyPayments,
} from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
function curMonth(ym?: string) {
  if (ym && /^\d{4}-\d{2}$/.test(ym)) return ym;
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}`;
}

const SB: Record<string, string> = {
  대기: "gray",
  청구: "orange",
  결제완료: "green",
  실패: "red",
  환불: "blue",
};

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{
    ym?: string;
    created?: string;
    seeded?: string;
    seed_error?: string;
  }>;
}) {
  const { ym, created, seeded, seed_error } = await searchParams;
  const period = curMonth(ym);
  const supabase = await createClient();

  const { data } = await supabase
    .from("invoices")
    .select("id, amount, status, source, due_date, paid_at, students(name)")
    .eq("period", period)
    .order("created_at", { ascending: false });
  const list = (data ?? []) as unknown as {
    id: string;
    amount: number;
    status: string;
    source: string;
    due_date: string | null;
    paid_at: string | null;
    students: { name: string } | null;
  }[];

  const sum = (f: (s: string) => boolean) =>
    list.filter((i) => f(i.status)).reduce((a, b) => a + Number(b.amount), 0);
  const cnt = (s: string) => list.filter((i) => i.status === s).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>청구 관리</h1>
          <p className="subtext">
            {period} 청구서 — 확정 수강건으로 생성, 입금 확인 후 결제완료 처리.
            행 클릭 → 상세(영수증·환불 등) 페이지.
          </p>
        </div>
        <div className="toolbar">
          <form action={seedDummyPayments}>
            <button
              className="btn"
              type="submit"
              title="결제완료인데 카드 정보 없는 청구서에 더미 영수증 정보 채워주기 (테스트 전용)"
            >
              더미 결제정보 채우기
            </button>
          </form>
          <form action={generateInvoices}>
            <input type="hidden" name="period" value={period} />
            <button className="btn primary" type="submit">{period} 청구서 생성</button>
          </form>
        </div>
      </div>

      {created && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          청구서 {created}건 생성됨.
        </div>
      )}

      {seeded && (
        <div
          className="panel"
          style={{
            background: "var(--blue-soft)",
            borderColor: "#b8d0ee",
            color: "var(--blue)",
            padding: "12px 16px",
          }}
        >
          더미 결제정보 {seeded}건 채움. 행을 클릭해 상세에서 카드 정보 확인하세요.
        </div>
      )}

      {seed_error && (
        <div
          className="panel"
          style={{
            background: "var(--red-soft)",
            borderColor: "#f0bdbd",
            color: "var(--red)",
            padding: "12px 16px",
          }}
        >
          <strong>더미 시드 실패</strong>
          <div style={{ marginTop: 4 }}>{seed_error}</div>
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>청구 건수</span><strong>{list.length}</strong></div>
        <div className="summary-card"><span>청구 대기</span><strong>{cnt("청구")}</strong></div>
        <div className="summary-card"><span>결제완료</span><strong>{cnt("결제완료")}</strong></div>
        <div className="summary-card">
          <span>수납액</span>
          <strong>{sum((s) => s === "결제완료").toLocaleString()}원</strong>
        </div>
        <div className="summary-card">
          <span>미수납액</span>
          <strong>
            {sum((s) => s !== "결제완료" && s !== "환불").toLocaleString()}원
          </strong>
        </div>
      </div>

      <form action={bulkInvoiceStatus} className="panel elevated">
        <input type="hidden" name="period" value={period} />
        <div className="panel-head">
          <p className="panel-title">{period} 청구서</p>
          <div className="toolbar">
            <button className="btn primary" name="status" value="결제완료" type="submit">
              선택 결제완료
            </button>
            <button className="btn warn" name="status" value="실패" type="submit">
              선택 실패
            </button>
            <button className="btn" name="status" value="환불" type="submit">
              선택 환불
            </button>
          </div>
        </div>
        <CheckRowToggle>
          <table>
            <thead>
              <tr>
                <th className="check-cell"></th>
                <th>학생</th>
                <th>금액</th>
                <th>발생</th>
                <th>납기일</th>
                <th>결제일</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className="row-link-host">
                  <td className="check-cell">
                    <input type="checkbox" name="ids" value={i.id} />
                  </td>
                  <td>
                    <Link
                      href={`/admin/billing/${i.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {i.students?.name ?? "-"}
                    </Link>
                  </td>
                  <td>{Number(i.amount).toLocaleString()}원</td>
                  <td className="muted">{i.source}</td>
                  <td className="muted">{i.due_date ?? "-"}</td>
                  <td className="muted">
                    {i.paid_at ? i.paid_at.slice(0, 10) : "-"}
                  </td>
                  <td>
                    <span className={`badge ${SB[i.status] ?? "gray"}`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      <strong>{period} 청구서가 없습니다</strong>
                      <p>
                        먼저 "다음 달 수강 확인"에서 {period}을 확정한 뒤 "청구서
                        생성"을 누르세요.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CheckRowToggle>
      </form>

      <p className="muted" style={{ marginTop: 10 }}>
        <Link href="/admin/renewals">← 다음 달 수강 확인</Link> ·{" "}
        <Link href="/admin/overdue">미납 관리 →</Link>
      </p>
    </>
  );
}
