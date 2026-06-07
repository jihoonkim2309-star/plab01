import { Bell, Bus, Clock, ChevronRight } from "lucide-react";
import DriverTabbar from "./Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { todayYmd, weekdayOf } from "@/lib/ymd";

type Run = { id: string; routeName: string; time: string; direction: string; vehicleName: string | null; stops: number };

async function fetchHome(): Promise<{ runs: Run[]; driverName: string | null }> {
  const guard = await requirePortal("driver");
  if (guard.isEmbed) {
    return {
      runs: [
        { id: "r1", routeName: "강남 1번 노선", time: "08:00", direction: "등원", vehicleName: "스타리아 12가 3456", stops: 5 },
      ],
      driverName: "박기사",
    };
  }
  const { supabase, userId, centerId } = guard;
  const { data: user } = await supabase.from("users").select("name").eq("id", userId).single();
  const driverName = (user as { name?: string } | null)?.name ?? null;

  if (!centerId) return { runs: [], driverName };
  const todayWeekday = weekdayOf(todayYmd());

  const { data: runRows } = await supabase
    .from("shuttle_runs")
    .select("id, start_time, route_id, vehicle_id")
    .eq("center_id", centerId)
    .eq("driver_user_id", userId)
    .eq("weekday", todayWeekday)
    .order("start_time", { ascending: true });
  type RR = { id: string; start_time: string | null; route_id: string | null; vehicle_id: string | null };
  const runs0 = (runRows ?? []) as RR[];
  if (runs0.length === 0) return { runs: [], driverName };

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

  const runs: Run[] = runs0.map((r) => ({
    id: r.id,
    routeName: r.route_id ? routeMap.get(r.route_id) ?? "노선" : "노선",
    time: r.start_time ? r.start_time.slice(0, 5) : "",
    direction: "",
    vehicleName: r.vehicle_id ? vehicleMap.get(r.vehicle_id) ?? null : null,
    stops: r.route_id ? stopCount.get(r.route_id) ?? 0 : 0,
  }));

  return { runs, driverName };
}

export default async function DriverHome() {
  const { runs, driverName } = await fetchHome();
  return (
    <>
      <div className="portal-topbar">
        <h1>{driverName ? `${driverName} 기사` : "플랜비 기사"}</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <strong>오늘의 운행</strong>
          {runs.length === 0 ? (
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>오늘 담당 운행이 없습니다.</p>
          ) : (
            <div style={{ marginTop: 10 }}>
              {runs.map((r) => (
                <a key={r.id} href={`/driver/runs/${r.id}`} className="list-row" style={{ padding: "10px 0" }}>
                  <div className="avatar" style={{ width: 40, height: 40 }}>
                    <Bus size={18} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="list-row-title">{r.routeName} {r.direction && `· ${r.direction}`}</div>
                    <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock size={11} /> {r.time} · 정류장 {r.stops}곳
                    </div>
                  </div>
                  <ChevronRight size={14} color="#9ca3af" />
                </a>
              ))}
            </div>
          )}
        </section>
      </div>
      <DriverTabbar />
    </>
  );
}
