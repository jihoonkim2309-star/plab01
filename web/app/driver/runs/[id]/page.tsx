import { ArrowLeft, Bell, Bus, MapPin, Users, ArrowUp, ArrowDown } from "lucide-react";
import { notFound } from "next/navigation";
import DriverTabbar from "../../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { todayYmd } from "@/lib/ymd";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

export default async function DriverRunDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const guard = await requirePortal("driver");
  if (guard.isEmbed) {
    return (
      <>
        <Header />
        <div className="portal-content">
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>로그인 후 이용해 주세요.</p>
          </section>
        </div>
        <DriverTabbar />
      </>
    );
  }
  const { supabase, userId, centerId } = guard;

  const { data: runRow } = await supabase
    .from("shuttle_runs")
    .select("id, weekday, start_time, end_time, route_id, vehicle_id, driver_user_id, center_id")
    .eq("id", id)
    .eq("driver_user_id", userId)
    .maybeSingle();
  const run = runRow as
    | { id: string; weekday: number; start_time: string | null; end_time: string | null; route_id: string | null; vehicle_id: string | null; center_id: string }
    | null;
  if (!run || (centerId && run.center_id !== centerId)) notFound();

  const [routeRes, vehicleRes, stopsRes] = await Promise.all([
    run.route_id
      ? supabase.from("shuttle_routes").select("name, direction").eq("id", run.route_id).maybeSingle()
      : Promise.resolve({ data: null }),
    run.vehicle_id
      ? supabase.from("shuttle_vehicles").select("name, plate").eq("id", run.vehicle_id).maybeSingle()
      : Promise.resolve({ data: null }),
    run.route_id
      ? supabase.from("shuttle_stops").select("id, name, sequence").eq("route_id", run.route_id).order("sequence", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);
  const route = routeRes.data as { name: string; direction: string | null } | null;
  const vehicle = vehicleRes.data as { name: string | null; plate: string | null } | null;
  const stops = (stopsRes.data ?? []) as { id: string; name: string; sequence: number }[];

  // 이 노선 배정 학생
  let students: { name: string; boardStop: string | null; alightStop: string | null }[] = [];
  if (run.route_id) {
    const { data: ssaRows } = await supabase
      .from("student_stop_assignments")
      .select("student_id, board_stop_id, alight_stop_id")
      .eq("route_id", run.route_id)
      .eq("status", "활성");
    const ssa = (ssaRows ?? []) as { student_id: string; board_stop_id: string | null; alight_stop_id: string | null }[];
    if (ssa.length > 0) {
      const stopName = new Map(stops.map((s) => [s.id, s.name]));
      const sids = Array.from(new Set(ssa.map((s) => s.student_id)));
      const { data: stRows } = await supabase.from("students").select("id, name").in("id", sids);
      const nameById = new Map(((stRows ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
      students = ssa.map((s) => ({
        name: nameById.get(s.student_id) ?? "학생",
        boardStop: s.board_stop_id ? stopName.get(s.board_stop_id) ?? null : null,
        alightStop: s.alight_stop_id ? stopName.get(s.alight_stop_id) ?? null : null,
      }));
    }
  }

  // 오늘 이 운행의 승하차 기록
  const today = todayYmd();
  const { data: logRows } = await supabase
    .from("boarding_logs")
    .select("student_id, action, scanned_at")
    .eq("run_id", run.id)
    .gte("scanned_at", `${today}T00:00:00`)
    .lte("scanned_at", `${today}T23:59:59`)
    .order("scanned_at", { ascending: false });
  const logs = (logRows ?? []) as { student_id: string; action: string; scanned_at: string }[];
  const boarded = logs.filter((l) => l.action === "승차").length;
  const alighted = logs.filter((l) => l.action === "하차").length;

  return (
    <>
      <Header />
      <div className="portal-content">
        <section className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div className="avatar" style={{ width: 48, height: 48 }}>
            <Bus size={22} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 15 }}>{route?.name ?? "노선"}</strong>
            <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>
              매주 {DAYS[run.weekday]} {run.start_time?.slice(0, 5) ?? ""}
              {run.end_time ? `–${run.end_time.slice(0, 5)}` : ""}
              {route?.direction ? ` · ${route.direction}` : ""}
            </div>
            {vehicle && (
              <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>
                차량: {`${vehicle.name ?? ""} ${vehicle.plate ?? ""}`.trim() || "-"}
              </div>
            )}
          </div>
        </section>

        <section className="card">
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Users size={15} /> 오늘 승하차
          </strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ArrowUp size={13} /> 승차</span><strong style={{ color: "var(--brand)" }}>{boarded}명</strong></div>
            <div className="info-row"><span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}><ArrowDown size={13} /> 하차</span><strong>{alighted}명</strong></div>
          </div>
        </section>

        <section className="card">
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <MapPin size={15} /> 정류장 ({stops.length})
          </strong>
          {stops.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>등록된 정류장이 없습니다.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {stops.map((s, i) => (
                <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < stops.length - 1 ? "1px solid #f1f5f4" : "none" }}>
                  <div style={{ width: 22, height: 22, borderRadius: 11, background: "var(--brand-soft)", color: "var(--brand)", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{i + 1}</div>
                  <span style={{ fontSize: 13 }}>{s.name}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <strong style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            <Users size={15} /> 배정 학생 ({students.length})
          </strong>
          {students.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>배정된 학생이 없습니다.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {students.map((s, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < students.length - 1 ? "1px solid #f1f5f4" : "none" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700 }}>{s.name}</div>
                    <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>
                      승차 {s.boardStop ?? "-"} · 하차 {s.alightStop ?? "-"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
      <DriverTabbar />
    </>
  );
}

function Header() {
  return (
    <div className="portal-topbar">
      <a href="/driver/runs" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
        <ArrowLeft size={18} /> 뒤로
      </a>
      <h1 style={{ flex: 1, textAlign: "center" }}>운행 상세</h1>
      <Bell size={20} />
    </div>
  );
}
