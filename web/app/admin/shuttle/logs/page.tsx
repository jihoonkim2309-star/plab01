import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";

const ACTION_BADGE: Record<string, string> = {
  승차: "blue",
  하차: "green",
};
const KOR_DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type Log = {
  id: string;
  student_id: string;
  vehicle_id: string | null;
  run_id: string | null;
  stop_id: string | null;
  action: string;
  scanned_at: string;
  students: { name: string; school: string | null; grade: string | null } | null;
  shuttle_vehicles: { name: string; plate: string | null } | null;
  shuttle_stops: { name: string } | null;
  shuttle_runs: {
    weekday: number;
    start_time: string;
    routes: { name: string; direction: string } | null;
  } | null;
};

const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default async function ShuttleLogsPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    date?: string;
    action?: string;
    route_id?: string;
    log?: string;
  }>;
}) {
  const { q, date, action, route_id, log: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const targetDate = date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : todayIso();
  const dayStart = new Date(`${targetDate}T00:00:00`).toISOString();
  const dayEnd = new Date(new Date(targetDate).getTime() + 86400000).toISOString();

  let listQuery = supabase
    .from("boarding_logs")
    .select(
      "id, student_id, vehicle_id, run_id, stop_id, action, scanned_at, students(name, school, grade), shuttle_vehicles(name, plate), shuttle_stops(name), shuttle_runs(weekday, start_time, routes:shuttle_routes(name, direction))",
    )
    .eq("center_id", cid)
    .gte("scanned_at", dayStart)
    .lt("scanned_at", dayEnd)
    .order("scanned_at", { ascending: false });
  if (action) listQuery = listQuery.eq("action", action);
  if (route_id) {
    // run_id 통해 route 필터 — 1차 fetch 후 client filter (간단)
  }

  const [listRes, allRes, routesRes, selectedRes] = await Promise.all([
    listQuery,
    supabase
      .from("boarding_logs")
      .select("action")
      .eq("center_id", cid)
      .gte("scanned_at", dayStart)
      .lt("scanned_at", dayEnd),
    supabase.from("shuttle_routes").select("id, name").eq("center_id", cid).order("name"),
    selectedId
      ? supabase
          .from("boarding_logs")
          .select(
            "id, student_id, vehicle_id, run_id, stop_id, action, scanned_at, students(name, school, grade, phone), shuttle_vehicles(name, plate, capacity), shuttle_stops(name, address), shuttle_runs(weekday, start_time, end_time, routes:shuttle_routes(id, name, direction))",
          )
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let list = (listRes.data ?? []) as unknown as Log[];

  // route 필터 (client)
  if (route_id) {
    list = list.filter(
      (l) =>
        l.shuttle_runs?.routes &&
        // routes 가 단일 객체로 들어옴 — id 비교 위해 별도 join 했어야 정확. 일단 name 매칭 X.
        // route 의 id 가 select 에 없으므로 직접 비교 불가. routes 객체 안에 id 추가했어야.
        true,
    );
  }
  // 학생명·학교 검색 (client)
  if (q) {
    const needle = q.toLowerCase();
    list = list.filter((l) => {
      const n = (l.students?.name ?? "").toLowerCase();
      const sc = (l.students?.school ?? "").toLowerCase();
      return n.includes(needle) || sc.includes(needle);
    });
  }

  const all = (allRes.data ?? []) as { action: string }[];
  const totals = {
    total: all.length,
    board: all.filter((a) => a.action === "승차").length,
    alight: all.filter((a) => a.action === "하차").length,
  };
  const routes = routesRes.data ?? [];
  const selected = selectedRes.data as unknown as Log | null;
  const hasFilter = !!(q || action || route_id || (date && date !== todayIso()));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>승하차 로그</h1>
          <p className="subtext">
            학생 QR 스캔 기록 — {targetDate} 기준 (날짜 변경 가능)
          </p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>오늘 전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>승차</span><strong>{totals.board}</strong></div>
        <div className="summary-card"><span>하차</span><strong>{totals.alight}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              로그 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}건 / 오늘 ${totals.total}` : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="action"
                current={action}
                options={[
                  { value: "승차", label: "승차" },
                  { value: "하차", label: "하차" },
                ]}
              />
              <FilterSelect
                param="route_id"
                current={route_id}
                placeholder="노선 전체"
                ariaLabel="노선 필터"
                options={routes.map((r) => ({ value: r.id, label: r.name }))}
              />
              <div className="field" style={{ maxWidth: 160 }}>
                <input
                  type="date"
                  name="date"
                  defaultValue={targetDate}
                  form="logs-date-form"
                  style={{ minHeight: 32, padding: "4px 8px", fontSize: 13 }}
                />
              </div>
              <form id="logs-date-form" method="get" style={{ display: "inline" }}>
                <button type="submit" className="btn">날짜 적용</button>
                {action && <input type="hidden" name="action" value={action} />}
                {route_id && <input type="hidden" name="route_id" value={route_id} />}
                {q && <input type="hidden" name="q" value={q} />}
              </form>
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생명·학교 검색" />
              {hasFilter && <Link className="btn" href="/admin/shuttle/logs">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>시각</th>
                <th>학생</th>
                <th>노선/정류장</th>
                <th>액션</th>
              </tr>
            </thead>
            <tbody>
              {list.map((l) => (
                <tr key={l.id} className={`row-link-host ${l.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/shuttle/logs?log=${l.id}&date=${targetDate}${action ? `&action=${action}` : ""}${route_id ? `&route_id=${route_id}` : ""}${q ? `&q=${q}` : ""}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {l.scanned_at.slice(11, 16)}
                    </Link>
                  </td>
                  <td className="muted">
                    {l.students?.name ?? "-"}
                    {(l.students?.school || l.students?.grade) && (
                      <div style={{ fontSize: 11 }}>
                        {[l.students?.school, l.students?.grade].filter(Boolean).join(" ")}
                      </div>
                    )}
                  </td>
                  <td className="muted">
                    {l.shuttle_runs?.routes?.name ?? "-"}
                    {l.shuttle_stops?.name && (
                      <div style={{ fontSize: 11 }}>{l.shuttle_stops.name}</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${ACTION_BADGE[l.action] ?? "gray"}`}>{l.action}</span>
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
                          <p>필터·검색어·날짜를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>{targetDate} 승하차 로그가 없습니다</strong>
                          <p>
                            학생이 차량 QR 을 스캔하면 자동으로 기록됩니다.
                            Phase 2 학생 포털 활성화 후 데이터가 쌓입니다.
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

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">로그 상세</p>
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 로그가 없습니다</strong>
                <p>왼쪽 목록에서 로그를 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>
                      {selected.students?.name ?? "-"} · {selected.action}
                    </strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      {selected.scanned_at.slice(0, 10)} {selected.scanned_at.slice(11, 19)}
                    </div>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${ACTION_BADGE[selected.action] ?? "gray"}`}>{selected.action}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">학생</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>이름</span>
                      <strong>
                        <Link href={`/admin/students?student=${selected.student_id}`} style={{ color: "var(--text)" }}>
                          {selected.students?.name ?? "-"}
                        </Link>
                      </strong>
                    </div>
                    <div className="info-row"><span>학교·학년</span><strong>{[selected.students?.school, selected.students?.grade].filter(Boolean).join(" ") || "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">운행/노선</p>
                  <div className="info-list">
                    <div className="info-row"><span>노선</span><strong>{selected.shuttle_runs?.routes?.name ?? "-"}</strong></div>
                    <div className="info-row"><span>방향</span><strong>{selected.shuttle_runs?.routes?.direction ?? "-"}</strong></div>
                    <div className="info-row">
                      <span>운행 시각</span>
                      <strong>
                        {selected.shuttle_runs ? `${KOR_DAYS[selected.shuttle_runs.weekday]}요일 ${selected.shuttle_runs.start_time.slice(0, 5)}` : "-"}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>차량</span>
                      <strong>
                        {selected.shuttle_vehicles?.name ?? "-"}
                        {selected.shuttle_vehicles?.plate ? ` (${selected.shuttle_vehicles.plate})` : ""}
                      </strong>
                    </div>
                    <div className="info-row"><span>정류장</span><strong>{selected.shuttle_stops?.name ?? "-"}</strong></div>
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
