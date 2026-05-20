import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function ProductsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("products")
    .select("id, name, kind, sessions_per_week, price, billing_cycle, active")
    .order("created_at", { ascending: false });
  const list = data ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>수강 상품 관리</h1>
          <p className="subtext">학생 등록·청구의 결제 상품 기준 데이터</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/products/new">
            상품 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 상품</span>
          <strong>{list.length}</strong>
        </div>
        <div className="summary-card">
          <span>활성</span>
          <strong>{list.filter((p) => p.active).length}</strong>
        </div>
        <div className="summary-card">
          <span>정규반</span>
          <strong>{list.filter((p) => p.kind === "정규반").length}</strong>
        </div>
        <div className="summary-card">
          <span>특강</span>
          <strong>{list.filter((p) => p.kind === "특강").length}</strong>
        </div>
        <div className="summary-card">
          <span>개인레슨</span>
          <strong>{list.filter((p) => p.kind === "개인레슨").length}</strong>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">상품 목록</p>
        </div>
        {error && (
          <div className="panel-body">
            <div className="field-error-text">{error.message}</div>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>상품명</th>
              <th>유형</th>
              <th>주간</th>
              <th>가격</th>
              <th>주기</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.id} className="row-link-host">
                <td>
                  <Link
                    href={`/admin/products/${p.id}/edit`}
                    className="row-link-stretch"
                    style={{ fontWeight: 900, color: "var(--text)" }}
                  >
                    {p.name}
                  </Link>
                </td>
                <td className="muted">{p.kind}</td>
                <td className="muted">
                  {p.sessions_per_week ? `주 ${p.sessions_per_week}회` : "-"}
                </td>
                <td>
                  <strong>{Number(p.price).toLocaleString()}원</strong>
                </td>
                <td className="muted">{p.billing_cycle}</td>
                <td>
                  {p.active ? (
                    <span className="badge green">활성</span>
                  ) : (
                    <span className="badge gray">비활성</span>
                  )}
                </td>
                <td>
                  <Link
                    className="btn"
                    style={{ minHeight: 30, padding: "4px 10px" }}
                    href={`/admin/products/${p.id}/edit`}
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>등록된 상품이 없습니다</strong>
                    <p>
                      “상품 생성”으로 수강 상품을 만들면 학생 등록·청구에서
                      사용됩니다.
                    </p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
