import Link from "next/link";
import { requireCenter } from "@/lib/center";

const KOR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];
const STATUS_BADGE: Record<string, string> = {
  대기: "gray",
  승차: "blue",
  하차: "green",
};

type Run = {
  id: string;
  route_id: string;
  weekday: number;
  start_time: string;
  end_time: string | null;
  vehicle_id: string | null;
  driver_user_id: string | null;
  status: string;
  routes: { id: string; name: string; direction: string } | null;
  shuttle_vehicles: { name: string; plate: string | null; capacity: number | null } | null;
  users: { name: string | null; phone: string | null } | null;
};

type Assignment = {
  student_id: string;
  route_id: string | null;
  board_stop_id: string | null;
  alight_stop_id: string | null;
  status: string;
  students: { name: string; school: string | null; grade: string | null } | null;
};

type Log = {
  student_id: string;
  run_id: string | null;
  action: string;
  scanned_at: string;
};

export default async function ShuttleDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ run?: string }>;
}) {
  const { run: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const now = new Date();
  const weekday = now.getDay();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

  // 오늘 요일의 운행
  const [runsRes, stopsRes, todaysLogsRes] = await Promise.all([
    supabase
      .from("shuttle_runs")
      .select(
        "id, route_id, weekday, start_time, end_time, vehicle_id, driver_user_id, status, routes:shuttle_routes(id, name, direction), shuttle_vehicles(name, plate, capacity), users(name, phone)",
      )
      .eq("center_id", cid)
      .eq("weekday", weekday)
      .eq("status", "운영")
      .order("start_time", { ascending: true }),
    supabase
      .from("shuttle_stops")
      .select("id, name, sequence, route_id")
      .eq("center_id", cid)
      .order("sequence"),
    supabase
      .from("boarding_logs")
      .select("student_id, run_id, action, scanned_at")
      .eq("center_id", cid)
      .gte("scanned_at", todayStart)
      .lt("scanned_at", todayEnd),
  ]);

  const runs = (runsRes.data ?? []) as unknown as Run[];
  const allStops = (stopsRes.data ?? []) as { id: string; name: string; sequence: number; route_id: string }[];
  const stopById = new Map(allStops.map((s) => [s.id, s]));
  const allLogs = (todaysLogsRes.data ?? []) as Log[];

  // 선택된 run 의 학생 배정 + 오늘 탑승 상태
  const selectedRun = runs.find((r) => r.id === selectedId) ?? runs[0] ?? null;
  let selectedAssignments: Assignment[] = [];
  if (selectedRun) {
    const { data: aRes } = await supabase
      .from("student_stop_assignments")
      .select(
        "student_id, route_id, board_stop_id, alight_stop_id, status, students(name, school, grade)",
      )
      .eq("center_id", cid)
      .eq("route_id", selectedRun.route_id)
      .eq("status", "활성");
    selectedAssignments = (aRes ?? []) as unknown as Assignment[];
  }

  // 학생별 마지막 boarding_log (선택된 run 에 한정)
  const lastActionByStudent = new Map<string, Log>();
  if (selectedRun) {
    for (const l of allLogs.filter((x) => x.run_id === selectedRun.id)) {
      const prev = lastActionByStudent.get(l.student_id);
      if (!prev || prev.scanned_at < l.scanned_at) lastActionByStudent.set(l.student_id, l);
    }
  }

  // 요약 카드
  const totalRuns = runs.length;
  const totalBoardings = allLogs.filter((l) => l.action === "승차").length;
  const totalAlightings = allLogs.filter((l) => l.action === "하차").length;
  // 운행별 학생 수 합계 (대략적 — 같은 학생이 여러 노선에 배정되면 중복 카운트)
  let totalStudents = 0;
  for (const r of runs) {
    totalStudents += allStops.filter((s) => s.route_id === r.route_id).length > 0 ? 1 : 0;
  }
  // 좀 더 정확: 운행별 배정 학생 수는 server 호출 비용 ↑. 단순 표시.

  return (
    <>
      <div className="page-head">
        <div>
          <h1>셔틀 현황</h1>
          <p className="subtext">
            오늘 {now.getFullYear()}년 {now.getMonth() + 1}월 {now.getDate()}일 ({KOR_DAYS[weekday]}요일) 운행 현황
          </p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>오늘 운행</span><strong>{totalRuns}</strong></div>
        <div className="summary-card"><span>오늘 승차</span><strong>{totalBoardings}</strong></div>
        <div className="summary-card"><span>오늘 하차</span><strong>{totalAlightings}</strong></div>
        <div className="summary-card"><span>활성 노선</span><strong>{new Set(runs.map((r) => r.route_id)).size}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              오늘 운행 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>{runs.length}건</span>
            </p>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>노선</th>
                <th>차량/기사</th>
              </tr>
            </thead>
            <tbody>
              {runs.map((r) => (
                <tr key={r.id} className={`row-link-host ${r.id === (selectedRun?.id ?? "") ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/shuttle/dashboard?run=${r.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {r.start_time.slice(0, 5)}
                      {r.end_time ? `~${r.end_time.slice(0, 5)}` : ""}
                    </Link>
                  </td>
                  <td className="muted">
                    <span className={`badge ${r.routes?.direction === "등교" ? "blue" : r.routes?.direction === "하교" ? "orange" : "brand"}`} style={{ marginRight: 6 }}>
                      {r.routes?.direction ?? "-"}
                    </span>
                    {r.routes?.name ?? "-"}
                  </td>
                  <td className="muted">
                    {[r.shuttle_vehicles?.name, r.users?.name].filter(Boolean).join(" · ") || "미배정"}
                  </td>
                </tr>
              ))}
              {runs.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">
                      <strong>오늘({KOR_DAYS[weekday]}요일) 운행이 없습니다</strong>
                      <p>운행 일정은 [셔틀 → 운행 일정] 에서 등록합니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">탑승 학생 명단</p>
            {selectedRun && (
              <div className="toolbar">
                <Link className="btn" href={`/admin/shuttle/runs?run=${selectedRun.id}`}>
                  운행 상세 →
                </Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selectedRun ? (
              <div className="empty-state">
                <strong>오늘 운행이 없습니다</strong>
                <p>운행이 등록되면 여기서 학생 탑승 현황이 표시됩니다.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>
                      {KOR_DAYS[selectedRun.weekday]}요일 {selectedRun.start_time.slice(0, 5)}
                    </strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {selectedRun.routes?.name ?? "-"} ({selectedRun.routes?.direction ?? "-"})
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">차량·기사</p>
                  <div className="info-list">
                    <div className="info-row"><span>차량</span><strong>{selectedRun.shuttle_vehicles?.name ?? "미배정"}{selectedRun.shuttle_vehicles?.plate ? ` (${selectedRun.shuttle_vehicles.plate})` : ""}</strong></div>
                    <div className="info-row"><span>정원</span><strong>{selectedRun.shuttle_vehicles?.capacity != null ? `${selectedRun.shuttle_vehicles.capacity}명` : "-"}</strong></div>
                    <div className="info-row"><span>기사</span><strong>{selectedRun.users?.name ?? "미배정"}</strong></div>
                    <div className="info-row"><span>기사 연락처</span><strong>{selectedRun.users?.phone ?? "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">
                    배정 학생{" "}
                    <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                      {selectedAssignments.length}명
                    </span>
                  </p>
                  {selectedAssignments.length === 0 ? (
                    <div className="muted" style={{ fontSize: 13 }}>
                      이 노선에 배정된 학생이 없습니다. [학생 배정] 에서 등록.
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>학생</th>
                          <th>탑승</th>
                          <th>하차</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedAssignments.map((a) => {
                          const last = lastActionByStudent.get(a.student_id);
                          const state = last ? last.action : "대기";
                          return (
                            <tr key={a.student_id}>
                              <td>
                                <Link href={`/admin/students?student=${a.student_id}`} style={{ color: "var(--text)", fontWeight: 700 }}>
                                  {a.students?.name ?? "-"}
                                </Link>
                                {(a.students?.school || a.students?.grade) && (
                                  <div className="muted" style={{ fontSize: 11 }}>
                                    {[a.students?.school, a.students?.grade].filter(Boolean).join(" ")}
                                  </div>
                                )}
                              </td>
                              <td className="muted">{a.board_stop_id ? stopById.get(a.board_stop_id)?.name ?? "-" : "-"}</td>
                              <td className="muted">{a.alight_stop_id ? stopById.get(a.alight_stop_id)?.name ?? "-" : "-"}</td>
                              <td>
                                <span className={`badge ${STATUS_BADGE[state] ?? "gray"}`}>{state}</span>
                                {last && (
                                  <div className="muted" style={{ fontSize: 11 }}>
                                    {last.scanned_at.slice(11, 16)}
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <p className="muted" style={{ fontSize: 11, marginTop: 12 }}>
                  💡 학생이 차량 QR 을 스캔하면 자동으로 승차/하차 기록됩니다 (Phase 2 학생 포털).
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
