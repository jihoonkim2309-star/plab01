import { Bell, Bus, Clock, ChevronRight } from "lucide-react";
import DriverTabbar from "./Tabbar";

const MOCK_RUNS = [
  { id: "r1", route: "강남 1번 노선 — 등원", time: "08:00", stops: 5, status: "대기" },
  { id: "r2", route: "강남 1번 노선 — 하원", time: "17:00", stops: 5, status: "대기" },
];

export default function DriverHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 기사</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <strong>오늘의 운행</strong>
          <div style={{ marginTop: 10 }}>
            {MOCK_RUNS.map((r) => (
              <a key={r.id} href={`/driver/runs/${r.id}`} className="list-row" style={{ padding: "10px 0" }}>
                <div className="avatar" style={{ width: 40, height: 40 }}>
                  <Bus size={18} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">{r.route}</div>
                  <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <Clock size={11} /> {r.time} · 정류장 {r.stops}곳
                  </div>
                </div>
                <span className="badge gray" style={{ fontSize: 10, padding: "2px 6px", background: "#f3f4f6", borderRadius: 4 }}>{r.status}</span>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))}
          </div>
        </section>

        <section className="card">
          <strong>오늘의 차량</strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span>차종</span><strong>스타리아 12인승</strong></div>
            <div className="info-row"><span>번호</span><strong>12가 3456</strong></div>
          </div>
        </section>
      </div>
      <DriverTabbar />
    </>
  );
}
