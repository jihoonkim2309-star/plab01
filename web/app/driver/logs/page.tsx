import { ArrowLeft, ArrowDown, ArrowUp, Bell } from "lucide-react";
import DriverTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { todayYmd, weekdayOf } from "@/lib/ymd";

type Log = { id: string; student: string; action: string; at: string; stop: string | null };

export default async function DriverLogs() {
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

  const today = todayYmd();
  const todayWeekday = weekdayOf(today);
  let logs: Log[] = [];

  if (centerId) {
    const { data: runRows } = await supabase
      .from("shuttle_runs")
      .select("vehicle_id")
      .eq("center_id", centerId)
      .eq("driver_user_id", userId)
      .eq("weekday", todayWeekday)
      .eq("status", "운영");
    const vehicleIds = Array.from(
      new Set(((runRows ?? []) as { vehicle_id: string | null }[]).map((r) => r.vehicle_id).filter((x): x is string => !!x)),
    );

    if (vehicleIds.length > 0) {
      const { data: logRows } = await supabase
        .from("boarding_logs")
        .select("id, student_id, action, scanned_at, stop_id")
        .in("vehicle_id", vehicleIds)
        .gte("scanned_at", `${today}T00:00:00`)
        .lte("scanned_at", `${today}T23:59:59`)
        .order("scanned_at", { ascending: false });
      const rows = (logRows ?? []) as { id: string; student_id: string; action: string; scanned_at: string; stop_id: string | null }[];

      if (rows.length > 0) {
        const sids = Array.from(new Set(rows.map((r) => r.student_id)));
        const stopIds = Array.from(new Set(rows.map((r) => r.stop_id).filter((x): x is string => !!x)));
        const [stRes, stopRes] = await Promise.all([
          supabase.from("students").select("id, name").in("id", sids),
          stopIds.length > 0
            ? supabase.from("shuttle_stops").select("id, name").in("id", stopIds)
            : Promise.resolve({ data: [] as { id: string; name: string }[] }),
        ]);
        const nameById = new Map(((stRes.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
        const stopById = new Map(((stopRes.data ?? []) as { id: string; name: string }[]).map((s) => [s.id, s.name]));
        logs = rows.map((r) => ({
          id: r.id,
          student: nameById.get(r.student_id) ?? "학생",
          action: r.action,
          at: r.scanned_at.slice(11, 16),
          stop: r.stop_id ? stopById.get(r.stop_id) ?? null : null,
        }));
      }
    }
  }

  return (
    <>
      <Header />
      <div className="portal-content">
        {logs.length === 0 ? (
          <section className="card">
            <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>오늘 승하차 기록이 없습니다.</p>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {logs.map((l) => (
              <div key={l.id} className="list-row" style={{ padding: "12px 16px" }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: l.action === "승차" ? "var(--brand-soft)" : "#fef2f2", color: l.action === "승차" ? "var(--brand)" : "#b42318", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {l.action === "승차" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">{l.student}</div>
                  <div className="list-row-sub">{l.stop ?? "-"}</div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{l.at}</div>
                  <div style={{ fontSize: 11, color: l.action === "승차" ? "var(--brand)" : "#b42318", fontWeight: 700, marginTop: 2 }}>{l.action}</div>
                </div>
              </div>
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
      <h1 style={{ flex: 1, textAlign: "center" }}>오늘 기록</h1>
      <Bell size={20} />
    </div>
  );
}
