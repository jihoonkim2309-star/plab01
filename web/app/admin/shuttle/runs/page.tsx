import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import FilterSelect from "../../FilterSelect";
import AssignShuttleModal from "../assignments/AssignShuttleModal";

const WEEKDAY_LABEL = ["일", "월", "화", "수", "목", "금", "토"];
const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  중단: "gray",
};
const DIR_BADGE: Record<string, string> = {
  등교: "blue",
  하교: "orange",
  순환: "brand",
};

type Run = {
  id: string;
  route_id: string;
  vehicle_id: string | null;
  driver_user_id: string | null;
  weekday: number;
  start_time: string;
  end_time: string | null;
  status: string;
  routes: { name: string; direction: string } | null;
  shuttle_vehicles: { name: string; plate: string | null } | null;
  users: { name: string | null; email: string | null } | null;
};

export default async function ShuttleRunsPage({
  searchParams,
}: {
  searchParams: Promise<{ route_id?: string; weekday?: string; status?: string; run?: string }>;
}) {
  const { route_id, weekday, status, run: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("shuttle_runs")
    .select(
      "id, route_id, vehicle_id, driver_user_id, weekday, start_time, end_time, status, routes:shuttle_routes(name, direction), shuttle_vehicles(name, plate), users(name, email)",
    )
    .eq("center_id", cid)
    .order("weekday", { ascending: true })
    .order("start_time", { ascending: true });
  if (route_id) listQuery = listQuery.eq("route_id", route_id);
  if (weekday !== undefined && weekday !== "") listQuery = listQuery.eq("weekday", Number(weekday));
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, routesRes, allRes, selectedRes, selectedStopsRes, allStudentsRes] = await Promise.all([
    listQuery,
    supabase.from("shuttle_routes").select("id, name").eq("center_id", cid).order("name"),
    supabase.from("shuttle_runs").select("status, weekday").eq("center_id", cid),
    selectedId
      ? supabase
          .from("shuttle_runs")
          .select(
            "id, route_id, vehicle_id, driver_user_id, weekday, start_time, end_time, status, routes:shuttle_routes(name, direction, status, memo), shuttle_vehicles(name, plate, capacity), users(name, email, phone)",
          )
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    Promise.resolve({ data: [] }), // will be replaced below if needed
    selectedId
      ? supabase
          .from("students")
          .select("id, name, attendance_days")
          .eq("center_id", cid)
          .order("name")
      : Promise.resolve({ data: [] }),
  ]);

  // 선택된 run 의 노선 stops + 배정 학생 조회
  const selectedRouteId = (selectedRes.data as { route_id?: string } | null)?.route_id;
  const [stopsForRunRes, assignmentsRes] = await Promise.all([
    selectedRouteId
      ? supabase
          .from("shuttle_stops")
          .select("id, route_id, sequence, name")
          .eq("center_id", cid)
          .eq("route_id", selectedRouteId)
          .order("sequence", { ascending: true })
      : Promise.resolve({ data: [] }),
    selectedRouteId
      ? supabase
          .from("student_stop_assignments")
          .select(
            "id, status, direction, weekdays, board_stop_id, alight_stop_id, students(id, name), board:shuttle_stops!board_stop_id(id, name, sequence), alight:shuttle_stops!alight_stop_id(id, name, sequence)",
          )
          .eq("center_id", cid)
          .eq("route_id", selectedRouteId)
          .eq("status", "활성")
      : Promise.resolve({ data: [] }),
  ]);
  const stopsForRun = stopsForRunRes.data ?? [];
  void selectedStopsRes;
  const allStudents = (allStudentsRes.data ?? []) as {
    id: string;
    name: string;
    attendance_days: string | null;
  }[];
  const routeAssignments = (assignmentsRes.data ?? []) as unknown as {
    id: string;
    status: string;
    direction: string | null;
    weekdays: string | null;
    board_stop_id: string | null;
    alight_stop_id: string | null;
    students: { id: string; name: string } | null;
    board: { id: string; name: string; sequence: number | null } | null;
    alight: { id: string; name: string; sequence: number | null } | null;
  }[];

  const list = (listRes.data ?? []) as unknown as Run[];
  const routes = routesRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string; weekday: number }[];
  const totals = {
    total: all.length,
    operating: all.filter((r) => r.status === "운영").length,
    stopped: all.filter((r) => r.status === "중단").length,
  };
  const selected = selectedRes.data as unknown as (Run & {
    routes: { name: string; direction: string; status: string; memo: string | null } | null;
    shuttle_vehicles: { name: string; plate: string | null; capacity: number | null } | null;
    users: { name: string | null; email: string | null; phone: string | null } | null;
  }) | null;
  const hasFilter = !!(route_id || weekday !== undefined && weekday !== "" || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>운행 일정</h1>
          <p className="subtext">노선 × 차량 × 기사 × 요일·시간 매칭 (반복 스케줄)</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/shuttle/runs/new">운행 등록</Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 운행</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영 중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>중단</span><strong>{totals.stopped}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              운행 목록{" "}
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
              <FilterSelect
                param="weekday"
                current={weekday}
                placeholder="요일 전체"
                ariaLabel="요일 필터"
                options={WEEKDAY_LABEL.map((d, i) => ({ value: String(i), label: d }))}
              />
              <FilterSelect
                param="route_id"
                current={route_id}
                placeholder="노선 전체"
                ariaLabel="노선 필터"
                options={routes.map((r) => ({ value: r.id, label: r.name }))}
              />
              <div style={{ flex: 1 }} />
              {hasFilter && <Link className="btn" href="/admin/shuttle/runs">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>요일</th>
                <th>시간</th>
                <th>노선</th>
                <th>차량/기사</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id} className={`row-link-host ${r.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/shuttle/runs?run=${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {WEEKDAY_LABEL[r.weekday]}
                    </Link>
                  </td>
                  <td className="muted">
                    {r.start_time.slice(0, 5)}
                    {r.end_time ? `~${r.end_time.slice(0, 5)}` : ""}
                  </td>
                  <td>
                    <span className={`badge ${DIR_BADGE[r.routes?.direction ?? ""] ?? "gray"}`} style={{ marginRight: 6 }}>
                      {r.routes?.direction ?? "-"}
                    </span>
                    <span style={{ fontWeight: 600 }}>{r.routes?.name ?? "-"}</span>
                  </td>
                  <td className="muted">
                    {[r.shuttle_vehicles?.name, r.users?.name].filter(Boolean).join(" · ") || "-"}
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
                          <p>필터를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>등록된 운행이 없습니다</strong>
                          <p>우측 상단 “운행 등록”으로 첫 일정을 만드세요. 노선·차량·기사를 미리 등록해 두면 드롭다운에서 선택 가능합니다.</p>
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
            <p className="panel-title">운행 상세</p>
            {selected && (
              <div className="toolbar">
                <AssignShuttleModal
                  triggerLabel="+ 학생 배정"
                  triggerClassName="btn"
                  routes={[
                    {
                      id: selected.route_id,
                      name: selected.routes?.name ?? "",
                      direction: selected.routes?.direction ?? null,
                    },
                  ]}
                  stops={stopsForRun as {
                    id: string;
                    route_id: string;
                    sequence: number | null;
                    name: string;
                  }[]}
                  students={allStudents}
                  fixedRouteId={selected.route_id}
                  backUrl={`/admin/shuttle/runs?run=${selected.id}`}
                />
                <Link className="btn primary" href={`/admin/shuttle/runs/${selected.id}/edit`}>수정</Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 운행이 없습니다</strong>
                <p>왼쪽 목록에서 운행 일정을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>
                      {WEEKDAY_LABEL[selected.weekday]}요일 {selected.start_time.slice(0, 5)}
                    </strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${DIR_BADGE[selected.routes?.direction ?? ""] ?? "gray"}`}>
                        {selected.routes?.direction ?? "-"}
                      </span>{" "}
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">운행 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>요일</span><strong>{WEEKDAY_LABEL[selected.weekday]}요일</strong></div>
                    <div className="info-row">
                      <span>시간</span>
                      <strong>
                        {selected.start_time.slice(0, 5)}
                        {selected.end_time ? `~${selected.end_time.slice(0, 5)}` : ""}
                      </strong>
                    </div>
                    <div className="info-row"><span>상태</span><strong>{selected.status}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">노선</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>이름</span>
                      <strong>
                        <Link href={`/admin/shuttle/routes?route=${selected.route_id}`} style={{ color: "var(--text)" }}>
                          {selected.routes?.name ?? "-"}
                        </Link>
                      </strong>
                    </div>
                    <div className="info-row"><span>방향</span><strong>{selected.routes?.direction ?? "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">차량</p>
                  {selected.shuttle_vehicles ? (
                    <div className="info-list">
                      <div className="info-row">
                        <span>이름</span>
                        <strong>
                          <Link href={`/admin/shuttle/vehicles?vehicle=${selected.vehicle_id}`} style={{ color: "var(--text)" }}>
                            {selected.shuttle_vehicles.name}
                          </Link>
                        </strong>
                      </div>
                      <div className="info-row"><span>번호판</span><strong>{selected.shuttle_vehicles.plate ?? "-"}</strong></div>
                      <div className="info-row"><span>정원</span><strong>{selected.shuttle_vehicles.capacity != null ? `${selected.shuttle_vehicles.capacity}명` : "-"}</strong></div>
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 13 }}>차량 미배정</div>
                  )}
                </div>

                <div className="detail-block">
                  <p className="detail-title">기사</p>
                  {selected.users ? (
                    <div className="info-list">
                      <div className="info-row"><span>이름</span><strong>{selected.users.name ?? "-"}</strong></div>
                      <div className="info-row"><span>연락처</span><strong>{selected.users.phone ?? "-"}</strong></div>
                      <div className="info-row"><span>이메일</span><strong>{selected.users.email ?? "-"}</strong></div>
                    </div>
                  ) : (
                    <div className="muted" style={{ fontSize: 13 }}>기사 미배정 — “기사” 역할 가입자가 있으면 수정 화면에서 배정할 수 있습니다.</div>
                  )}
                </div>

                <div className="detail-block">
                  <p className="detail-title">
                    배정 학생{" "}
                    <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                      {routeAssignments.length}명 · 노선 단위
                    </span>
                  </p>
                  {(() => {
                    const WD = ["일", "월", "화", "수", "목", "금", "토"];
                    const runDay = WD[selected.weekday];
                    return routeAssignments.length === 0 ? (
                      <div className="muted" style={{ fontSize: 13 }}>
                        이 노선에 배정된 학생이 없습니다. 우측 상단 [+ 학생 배정] 으로 추가하세요.
                      </div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>학생</th>
                            <th>승차</th>
                            <th>하차</th>
                            <th>요일</th>
                            <th>오늘 운행 ({runDay})</th>
                          </tr>
                        </thead>
                        <tbody>
                          {routeAssignments
                            .slice()
                            .sort((a, b) =>
                              (a.board?.sequence ?? 0) - (b.board?.sequence ?? 0),
                            )
                            .map((a) => {
                              const days = (a.weekdays ?? "")
                                .split(",")
                                .map((d) => d.trim())
                                .filter(Boolean);
                              const ridesThisRun =
                                days.length === 0 || days.includes(runDay);
                              return (
                                <tr
                                  key={a.id}
                                  style={!ridesThisRun ? { opacity: 0.45 } : undefined}
                                >
                                  <td>
                                    {a.students?.id ? (
                                      <Link
                                        href={`/admin/students?student=${a.students.id}`}
                                        style={{ fontWeight: 700, color: "var(--text)" }}
                                      >
                                        {a.students.name}
                                      </Link>
                                    ) : (
                                      <span className="muted">-</span>
                                    )}
                                  </td>
                                  <td className="muted">{a.board?.name ?? "-"}</td>
                                  <td className="muted">{a.alight?.name ?? "-"}</td>
                                  <td className="muted">
                                    {days.length === 0 ? (
                                      <span className="muted">전부</span>
                                    ) : (
                                      days.join(",")
                                    )}
                                  </td>
                                  <td>
                                    {ridesThisRun ? (
                                      <span className="badge green">탑승</span>
                                    ) : (
                                      <span className="badge gray">미탑승</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                        </tbody>
                      </table>
                    );
                  })()}
                  <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                    배정은 노선 단위로 저장됩니다. 같은 노선의 다른 운행에도 동일 학생 명단이 적용됩니다.
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
