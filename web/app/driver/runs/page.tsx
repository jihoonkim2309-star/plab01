import { ArrowLeft, Bell, Bus, ChevronRight, Clock } from "lucide-react";
import DriverTabbar from "../Tabbar";

const MOCK_RUNS = [
  { id: "r1", route: "강남 1번 — 등원", time: "08:00", date: "2026-06-04", stops: 5, status: "대기" },
  { id: "r2", route: "강남 1번 — 하원", time: "17:00", date: "2026-06-04", stops: 5, status: "대기" },
  { id: "r3", route: "강남 1번 — 등원", time: "08:00", date: "2026-06-03", stops: 5, status: "완료" },
];

export default function DriverRuns() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/driver" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>운행 일정</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ padding: 0 }}>
          {MOCK_RUNS.map((r) => (
            <a key={r.id} href={`/driver/runs/${r.id}`} className="list-row" style={{ padding: "14px 16px" }}>
              <div className="avatar" style={{ width: 40, height: 40 }}>
                <Bus size={18} />
              </div>
              <div style={{ flex: 1 }}>
                <div className="list-row-title">{r.route}</div>
                <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Clock size={11} /> {r.date} {r.time} · 정류장 {r.stops}곳
                </div>
              </div>
              <span style={{ fontSize: 10, padding: "3px 8px", background: r.status === "완료" ? "#d8ecdf" : "#f3f4f6", color: r.status === "완료" ? "var(--brand)" : "#374151", borderRadius: 6, fontWeight: 700 }}>
                {r.status}
              </span>
              <ChevronRight size={14} color="#9ca3af" />
            </a>
          ))}
        </section>
      </div>
      <DriverTabbar />
    </>
  );
}
