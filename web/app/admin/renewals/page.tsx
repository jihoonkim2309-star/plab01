import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { ensureEnrollmentsForCenter } from "@/lib/enrollments";
import { safeIlike } from "@/lib/db-search";
import { checkRenewalGate } from "@/lib/renewal";
import CheckRowToggle from "../CheckRowToggle";
import MonthNav from "../MonthNav";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ExportLink from "../ExportLink";
import { bulkRenewal, notifyRenewal } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
function nextMonth(ym?: string) {
  if (ym && /^\d{4}-\d{2}$/.test(ym)) return ym;
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const SB: Record<string, string> = {
  대기: "orange",
  확정: "green",
  보류: "gray",
};
// 화면 표시용 라벨 (DB값은 그대로 유지)
const STATUS_LABEL: Record<string, string> = {
  대기: "선택 대기 중",
  확정: "수강 확정",
  보류: "수강 보류",
};

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; q?: string; status?: string; notified?: string }>;
}) {
  const { ym, q, status, notified } = await searchParams;
  const target = nextMonth(ym);
  const { supabase, centerId: cid } = await requireCenter();

  // 다음 달 수강 확인 게이트 — 매월 N일 지나야 일괄 처리 가능
  const { data: center } = await supabase
    .from("centers")
    .select("renewal_check_day")
    .eq("id", cid)
    .maybeSingle();
  const gate = checkRenewalGate(
    (center as { renewal_check_day: number | null } | null)?.renewal_check_day,
  );

  // 멱등 enrollment 보충 — 청구·리포트 패턴 일관.
  // 학생에 상품 지정됐는데 수강중 enrollment 없는 학생 자동 생성.
  const autoEnrolled = await ensureEnrollmentsForCenter();

  // 서버 ilike — q 가 학생명 또는 상품명에 매칭되면 그 ID 들로 enrollments 좁히기
  const qSafe = safeIlike(q);
  let idFilter: { students: string[]; products: string[] } | null = null;
  if (qSafe) {
    const [{ data: sMatched }, { data: pMatched }] = await Promise.all([
      supabase
        .from("students")
        .select("id")
        .eq("center_id", cid)
        .ilike("name", `%${qSafe}%`),
      supabase
        .from("products")
        .select("id")
        .eq("center_id", cid)
        .ilike("name", `%${qSafe}%`),
    ]);
    idFilter = {
      students: (sMatched ?? []).map((r) => r.id),
      products: (pMatched ?? []).map((r) => r.id),
    };
  }

  // 전체 통계용 (q 무관) — 카운트만 필요
  const allQuery = supabase
    .from("enrollments")
    .select(
      "id, status, student_id, product_id, students(name), products(id, name, price)",
    )
    .eq("center_id", cid)
    .eq("status", "수강중");

  // 검색 적용 쿼리
  let listQuery = supabase
    .from("enrollments")
    .select(
      "id, status, student_id, product_id, students(name), products(id, name, price)",
    )
    .eq("center_id", cid)
    .eq("status", "수강중");
  if (idFilter) {
    const sIds = idFilter.students;
    const pIds = idFilter.products;
    if (sIds.length === 0 && pIds.length === 0) {
      listQuery = listQuery.eq(
        "id",
        "00000000-0000-0000-0000-000000000000",
      );
    } else {
      const parts: string[] = [];
      if (sIds.length) parts.push(`student_id.in.(${sIds.join(",")})`);
      if (pIds.length) parts.push(`product_id.in.(${pIds.join(",")})`);
      listQuery = listQuery.or(parts.join(","));
    }
  }

  const [allRes, listRes, rcRes] = await Promise.all([
    allQuery,
    listQuery,
    supabase
      .from("renewal_confirmations")
      .select("enrollment_id, status, decided_by_role, decided_at, notified_at, last_notify_count")
      .eq("center_id", cid)
      .eq("target_month", target),
  ]);

  type EnrRow = {
    id: string;
    status: string;
    student_id: string | null;
    product_id: string | null;
    students: { name: string } | null;
    products: { id: string; name: string; price: number } | null;
  };

  const rcByEnr = new Map(
    ((rcRes.data ?? []) as {
      enrollment_id: string;
      status: string;
      decided_by_role: string | null;
      decided_at: string | null;
      notified_at: string | null;
      last_notify_count: number | null;
    }[]).map((r) => [r.enrollment_id, r]),
  );

  const statusByEnr = new Map(
    (rcRes.data ?? []).map((r) => [r.enrollment_id, r.status]),
  );
  const st = (id: string) => statusByEnr.get(id) ?? "대기";

  const allList = (allRes.data ?? []) as unknown as EnrRow[];
  let list = (listRes.data ?? []) as unknown as EnrRow[];
  if (status) list = list.filter((e) => st(e.id) === status);

  const totals = {
    total: allList.length,
    pending: allList.filter((e) => st(e.id) === "대기").length,
    confirmed: allList.filter((e) => st(e.id) === "확정").length,
    held: allList.filter((e) => st(e.id) === "보류").length,
  };
  const confirmedAmount = allList
    .filter((e) => st(e.id) === "확정")
    .reduce((a, b) => a + Number(b.products?.price ?? 0), 0);
  const hasFilter = !!(q || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>다음 달 수강 확인</h1>
          <p className="subtext">다음 달 수강 확정·보류 (확정분이 청구 대상)</p>
        </div>
        <div className="toolbar">
          <MonthNav ym={target} baseUrl="/admin/renewals" />
          <form action={notifyRenewal}>
            <input type="hidden" name="target_month" value={target} />
            <button
              className="btn primary"
              type="submit"
              disabled={gate.state !== "after" || totals.pending === 0}
              title={
                gate.state !== "after"
                  ? "수강 확인일 이후 발송 가능"
                  : totals.pending === 0
                    ? "대기 상태 학생이 없습니다"
                    : `대기 ${totals.pending}명 학부모/학생에게 알림 큐잉`
              }
            >
              학부모 알림 발송 ({totals.pending})
            </button>
          </form>
        </div>
      </div>

      {notified && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          학부모·학생 알림 {notified} 건 발송 큐에 등록되었습니다 (FCM/알림톡 라이브 시 자동 전송).
        </div>
      )}

      {autoEnrolled > 0 && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          상품 지정된 학생 {autoEnrolled}건이 자동으로 수강 등록되었습니다.
        </div>
      )}

      {gate.state === "not-configured" && (
        <div
          className="panel"
          style={{
            background: "var(--orange-soft)",
            borderColor: "#f0d19a",
            color: "var(--orange)",
            padding: "12px 16px",
          }}
        >
          ⚠ <Link href="/admin/settings">설정</Link> 에서 다음 달 수강 확인일을 먼저 지정해 주세요.
        </div>
      )}
      {gate.state === "before" && (
        <div
          className="panel"
          style={{
            background: "var(--orange-soft)",
            borderColor: "#f0d19a",
            color: "var(--orange)",
            padding: "12px 16px",
          }}
        >
          매월 <b>{gate.day}일</b> 수강 확인일 · D-{gate.daysLeft}. 그날이 지나야 확정/보류 일괄 처리가 가능합니다.
        </div>
      )}
      {gate.state === "after" && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          매월 <b>{gate.day}일</b> 수강 확인일 · 일괄 처리 가능
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>수강 대상</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>미정 (대기)</span><strong>{totals.pending}</strong></div>
        <div className="summary-card"><span>수강 확정</span><strong>{totals.confirmed}</strong></div>
        <div className="summary-card"><span>수강 보류</span><strong>{totals.held}</strong></div>
        <div className="summary-card">
          <span>확정 예상액</span>
          <strong>{confirmedAmount.toLocaleString()}원</strong>
        </div>
      </div>

      <form action={bulkRenewal} className="panel elevated">
        <input type="hidden" name="target_month" value={target} />
        <div className="panel-head">
          <p className="panel-title">
            {target} 수강 대상{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                : `${list.length}건`}
            </span>
          </p>
          <div className="toolbar">
            <ExportLink
              href={`/api/admin/export/renewals?${(() => {
                const p = new URLSearchParams();
                p.set("ym", target);
                if (q) p.set("q", q);
                if (status) p.set("status", status);
                return p.toString();
              })()}`}
            />
            <button
              className="btn primary"
              name="status"
              value="확정"
              type="submit"
              disabled={gate.state !== "after"}
              title={
                gate.state === "not-configured"
                  ? "설정에서 수강 확인일을 먼저 지정하세요"
                  : gate.state === "before"
                    ? `수강 확인일까지 D-${gate.daysLeft}`
                    : "선택 학생을 활성으로 전환 + 다음 달 수강 확정"
              }
            >
              수강 확정 (활성)
            </button>
            <button
              className="btn warn"
              name="status"
              value="보류"
              type="submit"
              disabled={gate.state !== "after"}
              title="선택 학생을 휴원으로 전환 + 다음 달 청구 제외"
            >
              수강 보류 (휴원)
            </button>
          </div>
        </div>

        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <StatusChips
              param="status"
              current={status}
              options={[
                { value: "대기", label: "대기" },
                { value: "확정", label: "확정" },
                { value: "보류", label: "보류" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <SearchInput param="q" current={q} placeholder="학생·상품 검색" />
            {hasFilter && (
              <Link
                className="btn"
                href={`/admin/renewals?ym=${target}`}
              >
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
                <th>상품</th>
                <th>금액</th>
                <th>수강 확정 상태</th>
                <th>응답자</th>
                <th>알림</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => {
                const rc = rcByEnr.get(e.id);
                const role = rc?.decided_by_role;
                const currentStatus = st(e.id);
                const isPending = currentStatus === "대기";
                // 응답자: 결정된 행만 표시. 미정(대기) 행은 "—".
                const roleLabel =
                  role === "parent" ? "학부모" : role === "admin" ? "어드민" : null;
                const roleBadge =
                  role === "parent" ? "green" : role === "admin" ? "blue" : "gray";
                return (
                  <tr key={e.id} className="row-link-host">
                    <td className="check-cell">
                      <input type="checkbox" name="ids" value={e.id} />
                    </td>
                    <td>
                      {e.student_id ? (
                        <Link
                          href={`/admin/students?student=${e.student_id}`}
                          className="no-row-toggle"
                          style={{ color: "var(--text)", fontWeight: 900 }}
                        >
                          {e.students?.name ?? "-"}
                        </Link>
                      ) : (
                        <strong>{e.students?.name ?? "-"}</strong>
                      )}
                    </td>
                    <td className="muted">
                      {e.products?.id ? (
                        <Link
                          href={`/admin/products/${e.products.id}/edit`}
                          className="no-row-toggle"
                          style={{ color: "inherit" }}
                        >
                          {e.products.name}
                        </Link>
                      ) : (
                        (e.products?.name ?? "-")
                      )}
                    </td>
                    <td>
                      {e.products
                        ? `${Number(e.products.price).toLocaleString()}원`
                        : "-"}
                    </td>
                    <td>
                      <span className={`badge ${SB[currentStatus] ?? "gray"}`}>
                        {STATUS_LABEL[currentStatus] ?? currentStatus}
                      </span>
                    </td>
                    <td>
                      {isPending || !roleLabel ? (
                        <span className="muted">—</span>
                      ) : (
                        <>
                          <span className={`badge ${roleBadge}`}>{roleLabel}</span>
                          {rc?.decided_at && (
                            <div className="muted" style={{ fontSize: 11 }}>
                              {rc.decided_at.slice(0, 10)}
                            </div>
                          )}
                        </>
                      )}
                    </td>
                    <td className="muted">
                      {rc?.notified_at ? (
                        <>
                          {rc.notified_at.slice(0, 10)}
                          {rc.last_notify_count != null && (
                            <div style={{ fontSize: 11 }}>
                              · {rc.last_notify_count}건
                            </div>
                          )}
                        </>
                      ) : (
                        <span className="muted">미발송</span>
                      )}
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
                          <strong>수강중 등록이 없습니다</strong>
                          <p>
                            <Link href="/admin/students">학생 관리</Link>에서
                            학생에 수강료 상품을 지정하면 자동으로 여기에 표시됩니다.
                          </p>
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
