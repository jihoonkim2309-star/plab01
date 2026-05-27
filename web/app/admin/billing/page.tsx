import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { getCenterPg } from "@/lib/portone";
import { safeIlike } from "@/lib/db-search";
import CheckRowToggle from "../CheckRowToggle";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import PayInvoiceModal from "./PayInvoiceModal";
import {
  generateInvoices,
  bulkInvoiceStatus,
  deleteInvoice,
  requestParentPayment,
} from "./actions";

const CHANNEL_LABELS: Record<string, string> = {
  parent_portal: "포털",
  pg_in_store: "PG",
  offline_cash: "현금",
  offline_card: "단말",
  offline_transfer: "이체",
};

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
    status?: string;
    q?: string;
    requested?: string;
  }>;
}) {
  const { ym, created, status, q, requested } = await searchParams;
  const period = curMonth(ym);
  const { supabase, centerId: cid } = await requireCenter();

  // 학생명 검색: students.name ilike q 한 ID set 으로 invoices.in
  const qSafe = safeIlike(q);
  let studentFilter: string[] | null = null;
  if (qSafe) {
    const { data: matched } = await supabase
      .from("students")
      .select("id")
      .eq("center_id", cid)
      .ilike("name", `%${qSafe}%`);
    studentFilter = (matched ?? []).map((s) => s.id);
  }

  let listQuery = supabase
    .from("invoices")
    .select("id, amount, status, source, due_date, paid_at, payment_method, students(name)")
    .eq("center_id", cid)
    .eq("period", period)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (studentFilter !== null) {
    if (studentFilter.length === 0) listQuery = listQuery.eq("id", "00000000-0000-0000-0000-000000000000"); // 빈 결과
    else listQuery = listQuery.in("student_id", studentFilter);
  }
  const { data } = await listQuery;

  const list = (data ?? []) as unknown as {
    id: string;
    amount: number;
    status: string;
    source: string;
    due_date: string | null;
    paid_at: string | null;
    payment_method: string | null;
    students: { name: string } | null;
  }[];

  const pg = await getCenterPg(supabase, cid);

  const sum = (f: (s: string) => boolean) =>
    list.filter((i) => f(i.status)).reduce((a, b) => a + Number(b.amount), 0);
  const cnt = (s: string) => list.filter((i) => i.status === s).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>청구 관리</h1>
          <p className="subtext">월별 청구서 생성·관리 (결제 결과는 결제 상태에서)</p>
        </div>
        <div className="toolbar">
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
      {requested && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          학부모 포털에 {requested}건 결제 요청 알림이 큐잉되었습니다.
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>청구 건수</span><strong>{list.length}</strong></div>
        <div className="summary-card"><span>미결제</span><strong>{cnt("청구") + cnt("실패")}</strong></div>
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
        <input type="hidden" name="back" value={`/admin/billing?ym=${period}`} />
        <div className="panel-head">
          <p className="panel-title">{period} 청구서</p>
          <div className="toolbar">
            <button
              className="btn"
              type="submit"
              formAction={requestParentPayment}
              title="선택한 청구서를 학부모 포털에 결제 요청 알림으로 보냅니다"
            >
              선택 포털 결제 요청
            </button>
            <button className="btn primary" name="status" value="결제완료" type="submit">
              선택 결제완료
            </button>
            <button className="btn warn" name="status" value="실패" type="submit">
              선택 실패
            </button>
          </div>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <StatusChips
              param="status"
              current={status}
              options={[
                { value: "청구", label: "청구" },
                { value: "결제완료", label: "결제완료" },
                { value: "실패", label: "실패" },
                { value: "환불", label: "환불" },
                { value: "대기", label: "대기" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <SearchInput param="q" current={q} placeholder="학생명 검색" />
            {(status || q) && (
              <Link className="btn" href={`/admin/billing?ym=${period}`}>초기화</Link>
            )}
          </FilterBar>
        </div>
        <CheckRowToggle>
          <table>
            <thead>
              <tr>
                <th className="check-cell"></th>
                <th>학생</th>
                <th>금액</th>
                <th>출처</th>
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
                    <Link
                      href={`/admin/payment-status?inv=${i.id}`}
                      style={{ fontWeight: 900, color: "var(--text)" }}
                      title="결제 상태에서 상세 보기"
                      className="no-row-toggle"
                    >
                      {i.students?.name ?? "-"}
                    </Link>
                  </td>
                  <td>{Number(i.amount).toLocaleString()}원</td>
                  <td className="muted">{i.source}</td>
                  <td className="muted">{i.due_date ?? "-"}</td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span className={`badge ${SB[i.status] ?? "gray"}`}>
                        {i.status}
                      </span>
                      {i.status === "결제완료" && (
                        <span className="badge gray" title="결제 채널">
                          {i.payment_method
                            ? (CHANNEL_LABELS[i.payment_method] ?? i.payment_method)
                            : "수동"}
                        </span>
                      )}
                    </div>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }} className="no-row-toggle">
                      {(i.status === "청구" || i.status === "실패") && (
                        <PayInvoiceModal
                          invoiceId={i.id}
                          studentName={i.students?.name ?? "학생"}
                          amount={Number(i.amount)}
                          period={period}
                          dueDate={i.due_date}
                          storeId={pg.storeId}
                          channelKey={pg.channelKey}
                          backUrl={`/admin/billing?ym=${period}`}
                        />
                      )}
                      <form action={deleteInvoice.bind(null, i.id, period)}>
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
        <Link href="/admin/payment-status">결제 상태 →</Link> ·{" "}
        <Link href="/admin/overdue">미납 관리 →</Link>
      </p>
    </>
  );
}
