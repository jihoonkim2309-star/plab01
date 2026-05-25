import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import SearchInput from "../../SearchInput";
import { createRoute } from "./actions";

const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  중단: "gray",
};

const DIRECTION_BADGE: Record<string, string> = {
  등교: "blue",
  하교: "orange",
  순환: "brand",
};

export default async function ShuttleRoutesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; direction?: string }>;
}) {
  const { q, status, direction } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("shuttle_routes")
    .select("id, name, direction, status, memo, created_at")
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (direction) listQuery = listQuery.eq("direction", direction);
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);

  const [listRes, allRes, stopsRes] = await Promise.all([
    listQuery,
    supabase.from("shuttle_routes").select("status").eq("center_id", cid),
    supabase.from("shuttle_stops").select("route_id").eq("center_id", cid),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    operating: all.filter((r) => r.status === "운영").length,
    stopped: all.filter((r) => r.status === "중단").length,
  };
  const stopCountByRoute = new Map<string, number>();
  for (const s of stopsRes.data ?? []) {
    stopCountByRoute.set(s.route_id, (stopCountByRoute.get(s.route_id) ?? 0) + 1);
  }
  const hasFilter = !!(q || status || direction);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>노선/정류장 관리</h1>
          <p className="subtext">셔틀 노선 등록 · 노선별 정류장 순서 관리</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 노선</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영 중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>중단</span><strong>{totals.stopped}</strong></div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              노선 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                  : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "운영", label: "운영" },
                  { value: "중단", label: "중단" },
                ]}
              />
              <StatusChips
                param="direction"
                current={direction}
                options={[
                  { value: "등교", label: "등교" },
                  { value: "하교", label: "하교" },
                  { value: "순환", label: "순환" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="노선명 검색" />
              {hasFilter && (
                <Link className="btn" href="/admin/shuttle/routes">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th>노선명</th>
                <th>방향</th>
                <th>정류장</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className="row-link-host">
                  <td>
                    <Link
                      href={`/admin/shuttle/routes/${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${DIRECTION_BADGE[r.direction] ?? "gray"}`}>
                      {r.direction}
                    </span>
                  </td>
                  <td className="muted">{stopCountByRoute.get(r.id) ?? 0}개</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status] ?? "gray"}`}>
                      {r.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>등록된 노선이 없습니다</strong>
                          <p>우측 폼에서 첫 노선을 만드세요. 노선 등록 후 정류장을 추가할 수 있습니다.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createRoute} className="panel">
          <div className="panel-head">
            <p className="panel-title">노선 등록</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>노선 이름 *</label>
              <input name="name" required placeholder="예: 강남점 등교 1호선" />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>방향 *</label>
              <select name="direction" defaultValue="등교" required>
                <option value="등교">등교</option>
                <option value="하교">하교</option>
                <option value="순환">순환</option>
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>메모</label>
              <input name="memo" placeholder="예: 우천 시 노선 변경 등" />
            </div>
            <div className="detail-actions">
              <button className="btn primary" type="submit">노선 등록</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
