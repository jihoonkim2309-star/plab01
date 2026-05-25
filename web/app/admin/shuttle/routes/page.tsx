import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import SearchInput from "../../SearchInput";

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
  searchParams: Promise<{ q?: string; status?: string; direction?: string; route?: string }>;
}) {
  const { q, status, direction, route: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("shuttle_routes")
    .select("id, name, direction, status, memo, created_at")
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (direction) listQuery = listQuery.eq("direction", direction);
  if (q) listQuery = listQuery.ilike("name", `%${q}%`);

  const [listRes, allRes, stopsRes, selectedRes] = await Promise.all([
    listQuery,
    supabase.from("shuttle_routes").select("status").eq("center_id", cid),
    supabase.from("shuttle_stops").select("route_id, name, sequence").eq("center_id", cid).order("sequence"),
    selectedId
      ? supabase
          .from("shuttle_routes")
          .select("id, name, direction, status, memo")
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    operating: all.filter((r) => r.status === "운영").length,
    stopped: all.filter((r) => r.status === "중단").length,
  };
  const stopsByRoute = new Map<string, { name: string; sequence: number }[]>();
  for (const s of stopsRes.data ?? []) {
    const arr = stopsByRoute.get(s.route_id) ?? [];
    arr.push({ name: s.name, sequence: s.sequence });
    stopsByRoute.set(s.route_id, arr);
  }
  const selected = selectedRes.data;
  const selectedStops = selected ? stopsByRoute.get(selected.id) ?? [] : [];
  const hasFilter = !!(q || status || direction);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>노선/정류장 관리</h1>
          <p className="subtext">셔틀 노선 등록 · 노선별 정류장 순서 관리</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/shuttle/routes/new">
            노선 등록
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 노선</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영 중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>중단</span><strong>{totals.stopped}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              노선 목록{" "}
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
              {hasFilter && <Link className="btn" href="/admin/shuttle/routes">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
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
                <tr key={r.id} className={`row-link-host ${r.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/shuttle/routes?route=${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {r.name}
                    </Link>
                  </td>
                  <td>
                    <span className={`badge ${DIRECTION_BADGE[r.direction] ?? "gray"}`}>{r.direction}</span>
                  </td>
                  <td className="muted">{stopsByRoute.get(r.id)?.length ?? 0}개</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status] ?? "gray"}`}>{r.status}</span>
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
                          <p>우측 상단 “노선 등록”으로 첫 노선을 추가하세요.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">노선 상세</p>
            {selected && (
              <div className="toolbar">
                <Link className="btn primary" href={`/admin/shuttle/routes/${selected.id}`}>
                  수정/정류장 관리
                </Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 노선이 없습니다</strong>
                <p>왼쪽 목록에서 노선을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${DIRECTION_BADGE[selected.direction] ?? "gray"}`}>{selected.direction}</span>{" "}
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">노선 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>방향</span><strong>{selected.direction}</strong></div>
                    <div className="info-row"><span>상태</span><strong>{selected.status}</strong></div>
                    <div className="info-row"><span>메모</span><strong>{selected.memo || "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">
                    정류장 순서{" "}
                    <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                      {selectedStops.length}개
                    </span>
                  </p>
                  {selectedStops.length === 0 ? (
                    <div className="muted" style={{ fontSize: 13 }}>등록된 정류장 없음</div>
                  ) : (
                    <div className="info-list">
                      {selectedStops.map((s, i) => (
                        <div className="info-row" key={i}>
                          <span>{i + 1}.</span>
                          <strong>{s.name}</strong>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
                    정류장 추가·수정·순서 변경은 “수정/정류장 관리” 버튼에서 진행하세요.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
