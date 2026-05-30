import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { getCenterPg } from "@/lib/portone";
import { safeIlike } from "@/lib/db-search";
import { ensureInvoicesForMonth, resolveBillingMonth } from "@/lib/billing";
import CheckRowToggle from "../CheckRowToggle";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import MonthNav from "../MonthNav";
import ExportLink from "../ExportLink";
import PayInvoiceModal from "./PayInvoiceModal";
import RefundModal from "./RefundModal";
import { deleteInvoice, requestParentPayment } from "./actions";

const CHANNEL_LABELS: Record<string, string> = {
  parent_portal: "포털",
  pg_in_store: "PG",
  offline_cash: "현금",
  offline_card: "단말",
  offline_transfer: "이체",
};

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
    status?: string;
    q?: string;
    requested?: string;
  }>;
}) {
  const { ym, status, q, requested } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 자동 대상월 결정 — ym 명시되면 그 월, 아니면 renewal_check_day 기준 자동 (오늘 ≥ N → 다음달).
  let period: string;
  let isAutoMonth = false;
  let isNextCycle = false;
  let renewalCheckDay: number | null = null;
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    period = ym;
  } else {
    const { data: center } = await supabase
      .from("centers")
      .select("renewal_check_day")
      .eq("id", cid)
      .single();
    renewalCheckDay = (center as { renewal_check_day: number | null } | null)
      ?.renewal_check_day ?? null;
    const r = resolveBillingMonth(renewalCheckDay);
    period = r.period;
    isAutoMonth = true;
    isNextCycle = r.isNextCycle;
  }

  // 멱등 청구서 생성 — 확정 수강건이 있는데 청구서 없으면 자동 발행.
  // ym 명시 진입(과거월) 시에도 호출하여 실수로 삭제된 청구서 자동 복원.
  const autoCreated = await ensureInvoicesForMonth(period);

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
          <p className="subtext">
            수강 확정 → 자동 청구. 수강 확인일{renewalCheckDay ? ` ${renewalCheckDay}일` : ""} 이후 다음달 사이클로 자동 전환.
          </p>
        </div>
        <div className="toolbar">
          <MonthNav ym={period} baseUrl="/admin/billing" extra={{ status, q }} />
        </div>
      </div>

      {autoCreated > 0 && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          확정된 수강건 {autoCreated}건이 자동으로 청구서로 발행되었습니다.
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

      <form action={requestParentPayment} className="panel elevated">
        <input type="hidden" name="back" value={`/admin/billing?ym=${period}`} />
        <div className="panel-head">
          <p className="panel-title">
            {period} 청구서{" "}
            {isAutoMonth && (
              <span
                className="badge gray"
                style={{ marginLeft: 6, fontSize: 11, verticalAlign: "middle" }}
                title={
                  isNextCycle
                    ? "수강 확인일 이후 — 다음달 사이클로 자동 전환"
                    : "이번달 청구 사이클"
                }
              >
                {isNextCycle ? "다음 사이클" : "이번달"}
              </span>
            )}
          </p>
          <div className="toolbar">
            <ExportLink
              href={`/api/admin/export/billing?${(() => {
                const p = new URLSearchParams();
                p.set("ym", period);
                if (status) p.set("status", status);
                if (q) p.set("q", q);
                return p.toString();
              })()}`}
            />
            <button
              className="btn"
              type="submit"
              title="선택한 청구서를 학부모 포털에 결제 요청 알림으로 보냅니다"
            >
              선택 포털 결제 요청
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
                      {(i.status === "청구" ||
                        i.status === "실패" ||
                        i.status === "환불") && (
                        <PayInvoiceModal
                          invoiceId={i.id}
                          studentName={i.students?.name ?? "학생"}
                          amount={Number(i.amount)}
                          period={period}
                          dueDate={i.due_date}
                          storeId={pg.storeId}
                          channelKey={pg.channelKey}
                          backUrl={`/admin/billing?ym=${period}`}
                          isRefund={i.status === "환불"}
                        />
                      )}
                      {i.status === "결제완료" && (
                        <RefundModal
                          invoiceId={i.id}
                          studentName={i.students?.name ?? "학생"}
                          amount={Number(i.amount)}
                          period={period}
                          paymentMethod={i.payment_method}
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
                        <Link href={`/admin/renewals?ym=${period}`}>
                          다음 달 수강 확인
                        </Link>{" "}
                        에서 {period}을 확정하면 자동으로 여기에 청구서가
                        발행됩니다.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CheckRowToggle>
      </form>

    </>
  );
}
