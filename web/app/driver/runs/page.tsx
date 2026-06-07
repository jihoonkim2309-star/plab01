import { ArrowLeft, Bell, Bus, ChevronRight, Clock } from "lucide-react";
import DriverTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";

const DAYS = ["일", "월", "화", "수", "목", "금", "토"];

type Run = {
  id: string;
  routeName: string;
  weekday: number;
  time: string;
  vehicleName: string | null;
  stops: number;
};

export default async function DriverRuns() {
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

  let runs: Run[] = [];
  if (centerId) {
    const { data: runRows } = await supabase
      .from("shuttle_runs")
      .select("id, weekday, start_time, route_id, vehicle_id")
      .eq("center_id", centerId)
      .eq("driver_user_id", userId)
      .eq("status", "운영")
      .order("weekday", { ascending: true })
      .order("start_time", { ascending: true });
    type RR = { id: string; weekday: number; start_time: string | null; route_id: string | null; vehicle_id: string | null };
    const runs0 = (runRows ?? []) as RR[];

    if (runs0.length > 0) {
      const routeIds = Array.from(new Set(runs0.map((r) => r.route_id).filter((x): x is string => !!x)));
      const vehicleIds = Array.from(new Set(runs0.map((r) => r.vehicle_id).filter((x): x is string => !!x)));
      const [routesRes, vehiclesRes, stopsRes] = await Promise.all([
        routeIds.length > 0
          ? supabase.from("shuttle_routes").select("id, name").in("id", routeIds)
          : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        vehicleIds.length > 0
          ? supabase.from("shuttle_vehicles").select("id, name, plate").in("id", vehicleIds)
          : Promise.resolve({ data: [] as { id: string; name: string | null; plate: string | null }[] }),
        routeIds.length > 0
          ? supabase.from("shuttle_stops").select("route_id").in("route_id", routeIds)
          : Promise.resolve({ data: [] as { route_id: string }[] }),
      ]);
      const routeMap = new Map(((routesRes.data ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
      const vehicleMap = new Map(((vehiclesRes.data ?? []) as { id: string; name: string | null; plate: string | null }[]).map((v) => [v.id, `${v.name ?? ""} ${v.plate ?? ""}`.trim() || "차량"]));
      const stopCount = new Map<string, number>();
      for (const s of ((stopsRes.data ?? []) as { route_id: string }[])) {
        stopCount.set(s.route_id, (stopCount.get(s.route_id) ?? 0) + 1);
      }
      runs = runs0.map((r) => ({
        id: r.id,
        routeName: r.route_id ? routeMap.get(r.route_id) ?? "노선" : "노선",
        weekday: r.weekday,
        time: r.start_time ? r.start_time.slice(0, 5) : "",
        vehicleName: r.vehicle_id ? vehicleMap.get(r.vehicle_id) ?? null : null,
        stops: r.route_id ? stopCount.get(r.route_id) ?? 0 : 0,
      }));
    }
  }

  return (
    <>
      <Header />
      <div className="portal-content">
        {runs.length === 0 ? (
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>배정된 운행이 없습니다.</p>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {runs.map((r) => (
              <a key={r.id} href={`/driver/runs/${r.id}`} className="list-row" style={{ padding: "14px 16px" }}>
                <div className="avatar" style={{ width: 40, height: 40 }}>
                  <Bus size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">{r.routeName}</div>
                  <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                    <Clock size={11} /> 매주 {DAYS[r.weekday]} {r.time} · 정류장 {r.stops}곳
                  </div>
                </div>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))}
          </section>
        )}
      </div>
      <DriverTabbar />
    </>
  );
}

function Header() {
  return (
    <div className="portal-topbar">
      <a href="/driver" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
        <ArrowLeft size={18} /> 뒤로
      </a>
      <h1 style={{ flex: 1, textAlign: "center" }}>운행 일정</h1>
      <Bell size={20} />
    </div>
  );
}
