/* eslint-disable @next/next/no-img-element */
import { ArrowLeft, Bell } from "lucide-react";
import DriverTabbar from "../Tabbar";
import { requirePortal } from "@/lib/portal-auth";
import { todayYmd, weekdayOf } from "@/lib/ymd";

export default async function DriverScan() {
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

  // 오늘 운행 중 차량이 배정된 첫 운행
  let vehicle: { name: string | null; plate: string | null; qr_token: string } | null = null;
  let boarded = 0;
  let alighted = 0;

  if (centerId) {
    const { data: runRows } = await supabase
      .from("shuttle_runs")
      .select("id, vehicle_id, start_time")
      .eq("center_id", centerId)
      .eq("driver_user_id", userId)
      .eq("weekday", todayWeekday)
      .eq("status", "운영")
      .order("start_time", { ascending: true });
    const runs = (runRows ?? []) as { id: string; vehicle_id: string | null; start_time: string | null }[];
    const withVehicle = runs.find((r) => !!r.vehicle_id);

    if (withVehicle?.vehicle_id) {
      const { data: vRow } = await supabase
        .from("shuttle_vehicles")
        .select("name, plate, qr_token")
        .eq("id", withVehicle.vehicle_id)
        .maybeSingle();
      vehicle = vRow as { name: string | null; plate: string | null; qr_token: string } | null;

      // 오늘 이 차량의 승하차 카운트
      const { data: logRows } = await supabase
        .from("boarding_logs")
        .select("action")
        .eq("vehicle_id", withVehicle.vehicle_id)
        .gte("scanned_at", `${today}T00:00:00`)
        .lte("scanned_at", `${today}T23:59:59`);
      const logs = (logRows ?? []) as { action: string }[];
      boarded = logs.filter((l) => l.action === "승차").length;
      alighted = logs.filter((l) => l.action === "하차").length;
    }
  }

  return (
    <>
      <Header />
      <div className="portal-content">
        {!vehicle ? (
          <section className="card">
            <p style={{ fontSize: 13, color: "#6f7d78", padding: "12px 0", textAlign: "center" }}>
              오늘 배정된 차량 운행이 없습니다.
            </p>
          </section>
        ) : (
          <>
            <section className="card" style={{ textAlign: "center", padding: 24 }}>
              <p style={{ fontSize: 13, color: "#374151", marginBottom: 14 }}>
                학생이 카메라로 이 QR 을 스캔하면 자동 승·하차 기록.
              </p>
              <div style={{ width: 240, height: 240, margin: "0 auto", background: "#fff", border: "2px solid #111", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                <img src={`/api/shuttle/qr/${vehicle.qr_token}`} alt="차량 QR" width={220} height={220} />
              </div>
              <div style={{ marginTop: 10, fontSize: 12, color: "#6f7d78" }}>
                차량: {`${vehicle.name ?? ""} ${vehicle.plate ?? ""}`.trim() || "-"}
              </div>
            </section>

            <section className="card">
              <strong>오늘 승하차</strong>
              <div className="info-rows" style={{ marginTop: 10 }}>
                <div className="info-row"><span>승차</span><strong style={{ color: "var(--brand)" }}>{boarded}명</strong></div>
                <div className="info-row"><span>하차</span><strong>{alighted}명</strong></div>
              </div>
            </section>
          </>
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
      <h1 style={{ flex: 1, textAlign: "center" }}>차량 QR</h1>
      <Bell size={20} />
    </div>
  );
}
