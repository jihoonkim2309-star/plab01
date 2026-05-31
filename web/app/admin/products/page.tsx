import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";
import SortHeader from "../SortHeader";

const SORT_WHITELIST = new Set([
  "name",
  "kind",
  "price",
  "billing_cycle",
  "created_at",
]);

const KIND_BADGE: Record<string, string> = {
  정규반: "green",
  특강: "orange",
  개인레슨: "blue",
};

const fmt = (n: number) => `${(n ?? 0).toLocaleString()}원`;

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    kind?: string;
    sort?: string;
    dir?: string;
    product?: string;
  }>;
}) {
  const { q, status, kind, sort, dir, product: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const sortKey = sort && SORT_WHITELIST.has(sort) ? sort : "created_at";
  const ascending = sort && SORT_WHITELIST.has(sort) ? dir === "asc" : false;

  let listQuery = supabase
    .from("products")
    .select("id, name, kind, sessions_per_week, price, billing_cycle, active, created_at")
    .eq("center_id", cid)
    .order(sortKey, { ascending });
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);
  if (kind) listQuery = listQuery.eq("kind", kind);
  if (status === "active") listQuery = listQuery.eq("active", true);
  else if (status === "inactive") listQuery = listQuery.eq("active", false);

  const [listRes, allRes, selectedRes, usageRes] = await Promise.all([
    listQuery,
    supabase.from("products").select("kind, active").eq("center_id", cid),
    selectedId
      ? supabase
          .from("products")
          .select("id, name, kind, sessions_per_week, price, billing_cycle, active, created_at")
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    selectedId
      ? supabase.from("students").select("id").eq("center_id", cid).eq("product_id", selectedId)
      : Promise.resolve({ data: [] as { id: string }[] }),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { kind: string; active: boolean }[];
  const totals = {
    total: all.length,
    active: all.filter((p) => p.active).length,
    regular: all.filter((p) => p.kind === "정규반").length,
    special: all.filter((p) => p.kind === "특강").length,
    personal: all.filter((p) => p.kind === "개인레슨").length,
  };
  const selected = selectedRes.data;
  const usageCount = (usageRes.data ?? []).length;
  const hasFilter = !!(q || status || kind);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>수강료 상품</h1>
          <p className="subtext">학생이 매월 결제하는 요금 패키지 (회수별 단가)</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/products/new">
            수강료 상품 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 수강료 상품</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>활성</span><strong>{totals.active}</strong></div>
        <div className="summary-card"><span>정규반</span><strong>{totals.regular}</strong></div>
        <div className="summary-card"><span>특강</span><strong>{totals.special}</strong></div>
        <div className="summary-card"><span>개인레슨</span><strong>{totals.personal}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              수강료 상품 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}건 / 전체 ${totals.total}` : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "active", label: "활성" },
                  { value: "inactive", label: "비활성" },
                ]}
              />
              <FilterSelect
                param="kind"
                current={kind}
                placeholder="유형 전체"
                ariaLabel="상품 유형 필터"
                options={[
                  { value: "정규반", label: "정규반" },
                  { value: "특강", label: "특강" },
                  { value: "개인레슨", label: "개인레슨" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="상품명 검색" />
              {hasFilter && <Link className="btn" href="/admin/products">초기화</Link>}
            </FilterBar>
          </div>
          {listRes.error && (
            <div className="panel-body">
              <div className="field-error-text">{listRes.error.message}</div>
            </div>
          )}
          <div className="list-scroll">
          <table className="member-table">
            <thead>
              <tr>
                <th><SortHeader sortKey="name" label="상품명" current={sort} dir={dir} /></th>
                <th><SortHeader sortKey="kind" label="유형" current={sort} dir={dir} /></th>
                <th>회/주</th>
                <th><SortHeader sortKey="price" label="가격" current={sort} dir={dir} /></th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => (
                <tr key={p.id} className={`row-link-host ${p.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/products?product=${p.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {p.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${KIND_BADGE[p.kind] ?? "gray"}`}>{p.kind}</span>
                  </td>
                  <td>
                    {p.sessions_per_week ? (
                      <span className="badge gray">주 {p.sessions_per_week}회</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td><strong>{fmt(Number(p.price))}</strong></td>
                  <td>
                    {p.active ? (
                      <span className="badge green">활성</span>
                    ) : (
                      <span className="badge gray">비활성</span>
                    )}
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
                          <strong>등록된 수강료 상품이 없습니다</strong>
                          <p>우측 상단 "수강료 상품 생성"으로 만들면 학생 등록·청구에서 사용됩니다.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">수강료 상품 상세</p>
            {selected && (
              <div className="toolbar">
                <Link className="btn primary" href={`/admin/products/${selected.id}/edit`}>수정</Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 수강료 상품이 없습니다</strong>
                <p>왼쪽 목록에서 항목을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${KIND_BADGE[selected.kind] ?? "gray"}`}>{selected.kind}</span>{" "}
                      {selected.active ? (
                        <span className="badge green">활성</span>
                      ) : (
                        <span className="badge gray">비활성</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">수강료 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>유형</span><strong>{selected.kind}</strong></div>
                    <div className="info-row"><span>가격</span><strong style={{ color: "var(--brand)", fontSize: 16 }}>{fmt(Number(selected.price))}</strong></div>
                    <div className="info-row"><span>주간 횟수</span><strong>{selected.sessions_per_week ? `주 ${selected.sessions_per_week}회` : "-"}</strong></div>
                    <div className="info-row"><span>청구 주기</span><strong>{selected.billing_cycle}</strong></div>
                    <div className="info-row"><span>등록일</span><strong>{selected.created_at?.slice(0, 10) ?? "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">사용 현황</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>이 수강료 적용 학생</span>
                      <strong>
                        {usageCount > 0 ? (
                          <Link href={`/admin/students?product=${selected.id}`} style={{ color: "var(--brand)" }}>
                            {usageCount}명 →
                          </Link>
                        ) : "0명"}
                      </strong>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
