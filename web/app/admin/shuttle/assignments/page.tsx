import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";

const STATUS_BADGE: Record<string, string> = {
  활성: "green",
  중지: "gray",
};
const DIR_BADGE: Record<string, string> = {
  등교: "blue",
  하교: "orange",
  순환: "brand",
};

type Row = {
  id: string;
  student_id: string;
  route_id: string | null;
  board_stop_id: string | null;
  alight_stop_id: string | null;
  direction: string | null;
  status: string;
  students: { id: string; name: string; school: string | null; grade: string | null } | null;
  routes: { id: string; name: string; direction: string } | null;
  board_stop: { name: string } | null;
  alight_stop: { name: string } | null;
};

export default async function AssignmentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    route_id?: string;
    direction?: string;
    status?: string;
    assignment?: string;
  }>;
}) {
  const { q, route_id, direction, status, assignment: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("student_stop_assignments")
    .select(
      "id, student_id, route_id, board_stop_id, alight_stop_id, direction, status, students(id, name, school, grade), routes:shuttle_routes(id, name, direction), board_stop:shuttle_stops!student_stop_assignments_board_stop_id_fkey(name), alight_stop:shuttle_stops!student_stop_assignments_alight_stop_id_fkey(name)",
    )
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (route_id) listQuery = listQuery.eq("route_id", route_id);
  if (direction) listQuery = listQuery.eq("direction", direction);
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, routesRes, allRes] = await Promise.all([
    listQuery,
    supabase.from("shuttle_routes").select("id, name").eq("center_id", cid).order("name"),
    supabase.from("student_stop_assignments").select("status, direction").eq("center_id", cid),
  ]);

  let list = (listRes.data ?? []) as unknown as Row[];
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((r) => {
      const n = (r.students?.name ?? "").toLowerCase();
      const sc = (r.students?.school ?? "").toLowerCase();
      return n.includes(needle) || sc.includes(needle);
    });
  }
  const routes = routesRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string; direction: string | null }[];
  const totals = {
    total: all.length,
    active: all.filter((r) => r.status === "활성").length,
    boarding: all.filter((r) => r.direction === "등교").length,
    alighting: all.filter((r) => r.direction === "하교").length,
  };
  const selected = list.find((r) => r.id === selectedId) ?? null;
  const hasFilter = !!(q || route_id || direction || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>학생 배정</h1>
          <p className="subtext">학생별 셔틀 노선 · 탑승/하차 정류장 배정</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/shuttle/assignments/new">배정 추가</Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 배정</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>활성</span><strong>{totals.active}</strong></div>
        <div className="summary-card"><span>등교</span><strong>{totals.boarding}</strong></div>
        <div className="summary-card"><span>하교</span><strong>{totals.alighting}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              배정 목록{" "}
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
                  { value: "활성", label: "활성" },
                  { value: "중지", label: "중지" },
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
              <FilterSelect
                param="route_id"
                current={route_id}
                placeholder="노선 전체"
                ariaLabel="노선 필터"
                options={routes.map((r) => ({ value: r.id, label: r.name }))}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생명·학교 검색" />
              {hasFilter && <Link className="btn" href="/admin/shuttle/assignments">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>학생</th>
                <th>방향</th>
                <th>노선</th>
                <th>탑승→하차</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={`row-link-host ${r.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/shuttle/assignments?assignment=${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {r.students?.name ?? "-"}
                    </Link>
                    {r.students?.school && (
                      <div className="muted" style={{ fontSize: 12 }}>
                        {[r.students.school, r.students.grade].filter(Boolean).join(" ")}
                      </div>
                    )}
                  </td>
                  <td>
                    {r.direction ? (
                      <span className={`badge ${DIR_BADGE[r.direction] ?? "gray"}`}>{r.direction}</span>
                    ) : (
                      <span className="muted" style={{ fontSize: 12 }}>공통</span>
                    )}
                  </td>
                  <td className="muted">{r.routes?.name ?? "-"}</td>
                  <td className="muted">
                    {(r.board_stop?.name ?? "?") + " → " + (r.alight_stop?.name ?? "?")}
                  </td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[r.status] ?? "gray"}`}>{r.status}</span>
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
                          <strong>등록된 배정이 없습니다</strong>
                          <p>우측 상단 “배정 추가”로 학생을 노선·정류장에 배정하세요.</p>
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
            <p className="panel-title">배정 상세</p>
            {selected && (
              <div className="toolbar">
                <Link className="btn primary" href={`/admin/shuttle/assignments/${selected.id}/edit`}>수정</Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 배정이 없습니다</strong>
                <p>왼쪽 목록에서 배정을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.students?.name ?? "-"}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {[selected.students?.school, selected.students?.grade].filter(Boolean).join(" ") || "-"}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      {selected.direction && (
                        <span className={`badge ${DIR_BADGE[selected.direction] ?? "gray"}`} style={{ marginRight: 6 }}>
                          {selected.direction}
                        </span>
                      )}
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">배정 정보</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>학생</span>
                      <strong>
                        <Link href={`/admin/students?student=${selected.student_id}`} style={{ color: "var(--text)" }}>
                          {selected.students?.name ?? "-"}
                        </Link>
                      </strong>
                    </div>
                    <div className="info-row"><span>방향</span><strong>{selected.direction ?? "공통"}</strong></div>
                    <div className="info-row">
                      <span>노선</span>
                      <strong>
                        {selected.routes ? (
                          <Link href={`/admin/shuttle/routes?route=${selected.route_id}`} style={{ color: "var(--text)" }}>
                            {selected.routes.name}
                          </Link>
                        ) : "-"}
                      </strong>
                    </div>
                    <div className="info-row"><span>탑승 정류장</span><strong>{selected.board_stop?.name ?? "-"}</strong></div>
                    <div className="info-row"><span>하차 정류장</span><strong>{selected.alight_stop?.name ?? "-"}</strong></div>
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
