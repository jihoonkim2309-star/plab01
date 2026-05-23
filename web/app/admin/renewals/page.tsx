import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import CheckRowToggle from "../CheckRowToggle";
import MonthNav from "../MonthNav";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import { syncEnrollments, bulkRenewal } from "./actions";

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

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ ym?: string; q?: string; status?: string }>;
}) {
  const { ym, q, status } = await searchParams;
  const target = nextMonth(ym);
  const supabase = await createClient();

  const { data: enr } = await supabase
    .from("enrollments")
    .select(
      "id, status, student_id, product_id, students(name), products(id, name, price)",
    )
    .eq("status", "수강중");

  type EnrRow = {
    id: string;
    status: string;
    student_id: string | null;
    product_id: string | null;
    students: { name: string } | null;
    products: { id: string; name: string; price: number } | null;
  };
  let raw = (enr ?? []) as unknown as EnrRow[];

  const { data: rc } = await supabase
    .from("renewal_confirmations")
    .select("enrollment_id, status")
    .eq("target_month", target);
  const statusByEnr = new Map(
    (rc ?? []).map((r) => [r.enrollment_id, r.status]),
  );

  const st = (id: string) => statusByEnr.get(id) ?? "대기";

  if (status) raw = raw.filter((e) => st(e.id) === status);
  if (q) {
    const needle = q.toLowerCase();
    raw = raw.filter((e) => {
      const s = (e.students?.name ?? "").toLowerCase();
      const p = (e.products?.name ?? "").toLowerCase();
      return s.includes(needle) || p.includes(needle);
    });
  }

  const allList = (enr ?? []) as unknown as EnrRow[];
  const list = raw;

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
          <p className="subtext">
            {target} 수강 확정/보류 — 확정분이 청구 관리의 청구 대상이 됩니다
          </p>
        </div>
        <div className="toolbar">
          <MonthNav ym={target} baseUrl="/admin/renewals" />
          <form action={syncEnrollments}>
            <button className="btn" type="submit">
              수강 등록 동기화
            </button>
          </form>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>수강중</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>대기</span><strong>{totals.pending}</strong></div>
        <div className="summary-card"><span>확정</span><strong>{totals.confirmed}</strong></div>
        <div className="summary-card"><span>보류</span><strong>{totals.held}</strong></div>
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
            <button className="btn primary" name="status" value="확정" type="submit">
              선택 확정
            </button>
            <button className="btn warn" name="status" value="보류" type="submit">
              선택 보류
            </button>
            <button className="btn" name="status" value="대기" type="submit">
              대기로
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
                <th>{target} 상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((e) => (
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
                    <span className={`badge ${SB[st(e.id)] ?? "gray"}`}>
                      {st(e.id)}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
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
                            학생에 결제 상품을 지정한 뒤 "수강 등록 동기화" 를 누르세요.
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

      <p className="muted" style={{ marginTop: 10 }}>
        청구로 이동 <Link href={`/admin/billing?ym=${target}`}>{target} 청구 관리 →</Link>
      </p>
    </>
  );
}
