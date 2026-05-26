import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import CheckRowToggle from "../CheckRowToggle";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import { bulkOverdueAction } from "./actions";

function daysOver(due: string | null): number {
  if (!due) return 0;
  const d = new Date(due + "T00:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}
function bucket(n: number) {
  if (n >= 30) return { label: "장기(30일+)", cls: "red", key: "long" };
  if (n >= 7) return { label: "7-29일", cls: "red", key: "d7" };
  if (n >= 3) return { label: "3-6일", cls: "orange", key: "d3" };
  if (n >= 1) return { label: "1-2일", cls: "orange", key: "d1" };
  return { label: "당일", cls: "gray", key: "today" };
}

export default async function OverduePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bucket?: string }>;
}) {
  const { q, bucket: bucketFilter } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();
  const today = new Date().toISOString().slice(0, 10);

  // 서버 ilike — q 가 학생명 매칭되면 그 ID 들로 invoices 좁히기
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

  // 전체 (totals 용) — q 무관
  const allQuery = supabase
    .from("invoices")
    .select("id, period, amount, status, due_date, student_id, students(name)")
    .eq("center_id", cid)
    .in("status", ["청구", "실패"])
    .lt("due_date", today)
    .order("due_date", { ascending: true });

  // 검색 적용
  let listQuery = supabase
    .from("invoices")
    .select("id, period, amount, status, due_date, student_id, students(name)")
    .eq("center_id", cid)
    .in("status", ["청구", "실패"])
    .lt("due_date", today)
    .order("due_date", { ascending: true });
  if (studentFilter !== null) {
    if (studentFilter.length === 0) {
      listQuery = listQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    } else {
      listQuery = listQuery.in("student_id", studentFilter);
    }
  }

  const [allRes, listRes] = await Promise.all([allQuery, listQuery]);

  type Row = {
    id: string;
    period: string;
    amount: number;
    status: string;
    due_date: string | null;
    student_id: string | null;
    students: { name: string } | null;
  };
  let raw = (listRes.data ?? []) as unknown as Row[];

  // bucket 필터 (client-side — date 계산 기반)
  if (bucketFilter) {
    raw = raw.filter((i) => bucket(daysOver(i.due_date)).key === bucketFilter);
  }

  const list = raw;
  const allRaw = (allRes.data ?? []) as unknown as Row[];

  const total = list.reduce((a, b) => a + Number(b.amount), 0);
  const totals = {
    count: allRaw.length,
    amount: allRaw.reduce((a, b) => a + Number(b.amount), 0),
    d3: allRaw.filter((i) => bucket(daysOver(i.due_date)).key === "d3").length,
    d7: allRaw.filter((i) => bucket(daysOver(i.due_date)).key === "d7").length,
    long: allRaw.filter((i) => bucket(daysOver(i.due_date)).key === "long")
      .length,
  };
  const hasFilter = !!(q || bucketFilter);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>미납 관리</h1>
          <p className="subtext">납기 경과 미수납 청구 — 재청구·알림·수납 처리</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>미납 건수</span><strong>{totals.count}</strong></div>
        <div className="summary-card"><span>미납 총액</span><strong>{totals.amount.toLocaleString()}원</strong></div>
        <div className="summary-card"><span>3-6일</span><strong>{totals.d3}</strong></div>
        <div className="summary-card"><span>7-29일</span><strong>{totals.d7}</strong></div>
        <div className="summary-card"><span>장기(30일+)</span><strong>{totals.long}</strong></div>
      </div>

      <form action={bulkOverdueAction} className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">
            미납 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${list.length}건 · ${total.toLocaleString()}원 / 전체 ${totals.count}`
                : `${list.length}건 · ${total.toLocaleString()}원`}
            </span>
          </p>
          <div className="toolbar">
            <button className="btn" name="action" value="재청구" type="submit">
              선택 재청구
            </button>
            <button className="btn warn" name="action" value="알림" type="submit">
              선택 알림 발송
            </button>
            <ConfirmButton
              message="선택한 청구를 결제완료(수납)로 처리할까요?"
              className="btn primary"
              type="submit"
              name="action"
              value="결제완료"
            >
              선택 수납완료
            </ConfirmButton>
          </div>
        </div>

        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <StatusChips
              param="bucket"
              current={bucketFilter}
              options={[
                { value: "today", label: "당일" },
                { value: "d1", label: "1-2일" },
                { value: "d3", label: "3-6일" },
                { value: "d7", label: "7-29일" },
                { value: "long", label: "장기(30일+)" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <SearchInput param="q" current={q} placeholder="학생명 검색" />
            {hasFilter && (
              <Link className="btn" href="/admin/overdue">
                초기화
              </Link>
            )}
          </FilterBar>
        </div>

        <CheckRowToggle>
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
                  <tr key={i.id} className="row-link-host">
                    <td className="check-cell">
                      <input type="checkbox" name="ids" value={i.id} />
                    </td>
                    <td>
                      {i.student_id ? (
                        <Link
                          href={`/admin/students?student=${i.student_id}`}
                          className="no-row-toggle"
                          style={{ color: "var(--text)", fontWeight: 900 }}
                        >
                          {i.students?.name ?? "-"}
                        </Link>
                      ) : (
                        <strong>{i.students?.name ?? "-"}</strong>
                      )}
                    </td>
                    <td className="muted">
                      <Link
                        href={`/admin/billing?ym=${i.period}`}
                        className="no-row-toggle"
                        style={{ color: "inherit" }}
                      >
                        {i.period}
                      </Link>
                    </td>
                    <td>{Number(i.amount).toLocaleString()}원</td>
                    <td className="muted">{i.due_date ?? "-"}</td>
                    <td>
                      <span className={`badge ${b.cls}`}>
                        {b.label} ({n}일)
                      </span>
                    </td>
                    <td>
                      <Link
                        href={`/admin/payment-status?inv=${i.id}`}
                        className="no-row-toggle"
                      >
                        <span
                          className={`badge ${i.status === "실패" ? "red" : "orange"}`}
                        >
                          {i.status} →
                        </span>
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>미납 건이 없습니다</strong>
                          <p>납기를 지난 미수납 청구가 여기 표시됩니다.</p>
                        </>
                      )}
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
