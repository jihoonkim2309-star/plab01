import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getCenterPg } from "@/lib/portone";
import CheckRowToggle from "../CheckRowToggle";
import ConfirmButton from "../ConfirmButton";
import PayButton from "./PayButton";
import { generateInvoices, bulkInvoiceStatus, deleteInvoice } from "./actions";

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
  searchParams: Promise<{ ym?: string; created?: string }>;
}) {
  const { ym, created } = await searchParams;
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

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: prof } = await supabase
    .from("users")
    .select("center_id")
    .eq("id", user?.id ?? "")
    .single();
  const pg = await getCenterPg(
    supabase,
    (prof as { center_id: string } | null)?.center_id ?? "",
  );

  const sum = (f: (s: string) => boolean) =>
    list.filter((i) => f(i.status)).reduce((a, b) => a + Number(b.amount), 0);
  const cnt = (s: string) => list.filter((i) => i.status === s).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>청구 관리</h1>
          <p className="subtext">
            {period} 청구서 — 확정 수강건으로 생성, 입금 확인 후 결제완료 처리
          </p>
        </div>
        <div className="toolbar">
          <form action={generateInvoices}>
            <input type="hidden" name="period" value={period} />
            <button className="btn primary">{period} 청구서 생성</button>
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
        <CheckRowToggle>
        <table>
          <thead>
            <tr>
              <th className="check-cell"></th>
              <th>학생</th>
              <th>금액</th>
              <th>발생</th>
              <th>납기일</th>
              <th>상태</th>
              <th></th>
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
                <td>{Number(i.amount).toLocaleString()}원</td>
                <td className="muted">{i.source}</td>
                <td className="muted">{i.due_date ?? "-"}</td>
                <td>
                  <span className={`badge ${SB[i.status] ?? "gray"}`}>
                    {i.status}
                  </span>
                </td>
                <td>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    {(i.status === "청구" || i.status === "실패") && (
                      <PayButton
                        invoiceId={i.id}
                        amount={Number(i.amount)}
                        orderName={`${period} 수강료 · ${i.students?.name ?? ""}`}
                        storeId={pg.storeId}
                        channelKey={pg.channelKey}
                      />
                    )}
                    <form action={deleteInvoice.bind(null, i.id, period)} className="no-row-toggle">
                      <ConfirmButton
                        message={`'${i.students?.name ?? "학생"}'의 청구서를 삭제할까요?`}
                        className="btn danger"
                        style={{ minHeight: 30, padding: "4px 10px" }}
                        type="submit"
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>{period} 청구서가 없습니다</strong>
                    <p>
                      먼저 “다음 달 수강 확인”에서 {period}을 확정한 뒤 “청구서
                      생성”을 누르세요.
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
