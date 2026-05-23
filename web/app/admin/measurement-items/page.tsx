import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";
import { seedItems, moveItemUp, moveItemDown } from "./actions";
import ItemIcon, { IconLibrary } from "./ItemIcon";

const CAT_BADGE: Record<string, string> = {
  신체: "blue",
  바디사이즈: "blue",
  바디비율: "blue",
  기초체력: "green",
  체력: "green",
  배드민턴: "orange",
  밸런스: "gray",
};

export default async function MeasurementItemsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; category?: string }>;
}) {
  const { q, status, category } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // status 의미: 없음=활성만(기본), "inactive"=비활성만, "all"=전체
  let listQuery = supabase
    .from("measurement_items")
    .select(
      "id, category, name, unit, value_kind, sort_order, active, icon, icon_url, icon_hidden",
    )
    .eq("center_id", cid)
    .order("sort_order", { ascending: true });
  if (status === "inactive") listQuery = listQuery.eq("active", false);
  else if (status !== "all") listQuery = listQuery.eq("active", true);
  if (category) listQuery = listQuery.eq("category", category);
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase
      .from("measurement_items")
      .select("category, active")
      .eq("center_id", cid),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { category: string; active: boolean }[];
  const error = listRes.error;

  const byCat = (c: string) =>
    all.filter((i) => i.category === c && i.active).length;

  // 같은 카테고리 안에서 첫/마지막 항목 표시 (위/아래 버튼 비활성 판정용).
  const groupSiblings = new Map<string, { first: string; last: string }>();
  for (const cat of new Set(list.map((i) => i.category))) {
    const inCat = list.filter((i) => i.category === cat);
    if (inCat.length) {
      groupSiblings.set(cat, {
        first: inCat[0].id,
        last: inCat[inCat.length - 1].id,
      });
    }
  }

  const totalActive = all.filter((i) => i.active).length;
  const hasFilter = !!(q || status || category);

  const statusUrl = (val: "active" | "inactive" | "all") => {
    const qs = new URLSearchParams();
    if (val !== "active") qs.set("status", val);
    if (q) qs.set("q", q);
    if (category) qs.set("category", category);
    const s = qs.toString();
    return `/admin/measurement-items${s ? `?${s}` : ""}`;
  };
  const cur = (status as "active" | "inactive" | "all" | undefined) ?? "active";

  return (
    <>
      <IconLibrary />
      <div className="page-head">
        <div>
          <h1>측정 항목 관리</h1>
          <p className="subtext">
            리포트에 들어갈 측정 항목 마스터 · 카테고리·단위·활성·아이콘 관리
          </p>
        </div>
        <div className="toolbar">
          {all.length === 0 && (
            <form action={seedItems}>
              <button className="btn" type="submit">
                프로토타입 항목 시드
              </button>
            </form>
          )}
          <Link className="btn primary" href="/admin/measurement-items/new">
            항목 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 (활성)</span>
          <strong>{totalActive}</strong>
        </div>
        <div className="summary-card">
          <span>신체</span>
          <strong>{byCat("신체")}</strong>
        </div>
        <div className="summary-card">
          <span>바디사이즈</span>
          <strong>{byCat("바디사이즈")}</strong>
        </div>
        <div className="summary-card">
          <span>바디비율</span>
          <strong>{byCat("바디비율")}</strong>
        </div>
        <div className="summary-card">
          <span>기초체력</span>
          <strong>{byCat("기초체력")}</strong>
        </div>
        <div className="summary-card">
          <span>배드민턴</span>
          <strong>{byCat("배드민턴")}</strong>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">
            항목 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${list.length}건 / 전체 ${totalActive}(활성)`
                : `${list.length}건`}
            </span>
          </p>
        </div>

        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <div className="filter-chips" role="group">
              <Link
                className={`btn${cur === "active" ? " toggle-active" : ""}`}
                href={statusUrl("active")}
              >
                활성
              </Link>
              <Link
                className={`btn${cur === "inactive" ? " toggle-active" : ""}`}
                href={statusUrl("inactive")}
              >
                비활성
              </Link>
              <Link
                className={`btn${cur === "all" ? " toggle-active" : ""}`}
                href={statusUrl("all")}
              >
                전체
              </Link>
            </div>
            <FilterSelect
              param="category"
              current={category}
              placeholder="카테고리 전체"
              ariaLabel="카테고리 필터"
              options={[
                { value: "신체", label: "신체" },
                { value: "바디사이즈", label: "바디사이즈" },
                { value: "바디비율", label: "바디비율" },
                { value: "기초체력", label: "기초체력" },
                { value: "배드민턴", label: "배드민턴" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <SearchInput param="q" current={q} placeholder="항목명 검색" />
            {hasFilter && (
              <Link className="btn" href="/admin/measurement-items">
                초기화
              </Link>
            )}
          </FilterBar>
        </div>

        {error && (
          <div className="panel-body">
            <div className="field-error-text">{error.message}</div>
          </div>
        )}
        <table>
          <thead>
            <tr>
              <th>카테고리</th>
              <th>아이콘</th>
              <th>항목명</th>
              <th>단위</th>
              <th>형식</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} className="row-link-host">
                <td>
                  <span className={`badge ${CAT_BADGE[i.category] ?? "gray"}`}>
                    {i.category}
                  </span>
                </td>
                <td>
                  <ItemIcon
                    name={i.name}
                    category={i.category}
                    fallback={i.icon ?? null}
                    iconUrl={i.icon_url ?? null}
                    iconHidden={i.icon_hidden ?? false}
                  />
                </td>
                <td>
                  <Link
                    href={`/admin/measurement-items/${i.id}/edit`}
                    className="row-link-stretch"
                    style={{ fontWeight: 900, color: "var(--text)" }}
                  >
                    {i.name}
                  </Link>
                </td>
                <td className="muted">{i.unit ?? "-"}</td>
                <td className="muted">{i.value_kind}</td>
                <td>
                  {i.active ? (
                    <span className="badge green">활성</span>
                  ) : (
                    <span className="badge gray">비활성</span>
                  )}
                </td>
                <td>
                  <div
                    style={{ display: "flex", gap: 4, justifyContent: "flex-end" }}
                    className="no-row-toggle"
                  >
                    <form action={moveItemUp.bind(null, i.id)}>
                      <button
                        type="submit"
                        className="btn"
                        style={{ minHeight: 30, padding: "4px 8px" }}
                        disabled={
                          groupSiblings.get(i.category)?.first === i.id
                        }
                        title="위로 이동 (같은 카테고리 내)"
                      >
                        ↑
                      </button>
                    </form>
                    <form action={moveItemDown.bind(null, i.id)}>
                      <button
                        type="submit"
                        className="btn"
                        style={{ minHeight: 30, padding: "4px 8px" }}
                        disabled={
                          groupSiblings.get(i.category)?.last === i.id
                        }
                        title="아래로 이동 (같은 카테고리 내)"
                      >
                        ↓
                      </button>
                    </form>
                    <Link
                      className="btn"
                      style={{ minHeight: 30, padding: "4px 10px" }}
                      href={`/admin/measurement-items/${i.id}/edit`}
                    >
                      수정
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
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
                        <strong>등록된 항목이 없습니다</strong>
                        <p>
                          위의 “프로토타입 항목 시드” 로 20개 기본 항목을 한 번에
                          등록하거나, “항목 생성” 으로 직접 추가하세요.
                        </p>
                      </>
                    )}
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
