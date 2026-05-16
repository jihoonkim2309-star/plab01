import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
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
  searchParams: Promise<{ ym?: string }>;
}) {
  const { ym } = await searchParams;
  const target = nextMonth(ym);
  const supabase = await createClient();

  const { data: enr } = await supabase
    .from("enrollments")
    .select(
      "id, status, students(name), products(name, price)",
    )
    .eq("status", "수강중");
  const list = (enr ?? []) as unknown as {
    id: string;
    students: { name: string } | null;
    products: { name: string; price: number } | null;
  }[];

  const { data: rc } = await supabase
    .from("renewal_confirmations")
    .select("enrollment_id, status")
    .eq("target_month", target);
  const statusByEnr = new Map(
    (rc ?? []).map((r) => [r.enrollment_id, r.status]),
  );

  const st = (id: string) => statusByEnr.get(id) ?? "대기";
  const cnt = (s: string) => list.filter((e) => st(e.id) === s).length;

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
          <form action={syncEnrollments}>
            <button className="btn">수강 등록 동기화</button>
          </form>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>수강중</span><strong>{list.length}</strong></div>
        <div className="summary-card"><span>대기</span><strong>{cnt("대기")}</strong></div>
        <div className="summary-card"><span>확정</span><strong>{cnt("확정")}</strong></div>
        <div className="summary-card"><span>보류</span><strong>{cnt("보류")}</strong></div>
        <div className="summary-card"><span>대상 월</span><strong>{target}</strong></div>
      </div>

      <form action={bulkRenewal} className="panel elevated">
        <input type="hidden" name="target_month" value={target} />
        <div className="panel-head">
          <p className="panel-title">{target} 수강 대상</p>
          <div className="toolbar">
            <button className="btn primary" name="status" value="확정">
              선택 확정
            </button>
            <button className="btn warn" name="status" value="보류">
              선택 보류
            </button>
            <button className="btn" name="status" value="대기">
              대기로
            </button>
          </div>
        </div>
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
              <tr key={e.id}>
                <td className="check-cell">
                  <input type="checkbox" name="ids" value={e.id} />
                </td>
                <td>
                  <strong>{e.students?.name ?? "-"}</strong>
                </td>
                <td className="muted">{e.products?.name ?? "-"}</td>
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
                    <strong>수강중 등록이 없습니다</strong>
                    <p>
                      학생에 결제 상품을 지정한 뒤 “수강 등록 동기화”를 누르세요.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </form>

      <p className="muted" style={{ marginTop: 10 }}>
        다른 달 보기:{" "}
        <Link href="/admin/renewals">다음 달</Link> · 청구로 이동{" "}
        <Link href="/admin/billing">청구 관리 →</Link>
      </p>
    </>
  );
}
