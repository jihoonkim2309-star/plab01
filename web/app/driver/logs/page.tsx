import { ArrowLeft, ArrowDown, ArrowUp, Bell } from "lucide-react";
import DriverTabbar from "../Tabbar";

const MOCK_LOGS = [
  { id: "l5", student: "박도윤", action: "승차", at: "16:55", stop: "한빛초 정문" },
  { id: "l4", student: "강시우", action: "승차", at: "16:52", stop: "한솔초 정문" },
  { id: "l3", student: "장유준", action: "승차", at: "16:48", stop: "샛별중 후문" },
  { id: "l2", student: "오예린", action: "하차", at: "08:12", stop: "본점" },
  { id: "l1", student: "박도윤", action: "하차", at: "08:10", stop: "본점" },
];

export default function DriverLogs() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/driver" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>오늘 기록</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ padding: 0 }}>
          {MOCK_LOGS.map((l) => (
            <div key={l.id} className="list-row" style={{ padding: "12px 16px" }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: l.action === "승차" ? "var(--brand-soft)" : "#fef2f2", color: l.action === "승차" ? "var(--brand)" : "#b42318", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {l.action === "승차" ? <ArrowUp size={16} /> : <ArrowDown size={16} />}
              </div>
              <div style={{ flex: 1 }}>
                <div className="list-row-title">{l.student}</div>
                <div className="list-row-sub">{l.stop}</div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 13, fontWeight: 700 }}>{l.at}</div>
                <div style={{ fontSize: 11, color: l.action === "승차" ? "var(--brand)" : "#b42318", fontWeight: 700, marginTop: 2 }}>{l.action}</div>
              </div>
            </div>
          ))}
        </section>
      </div>
      <DriverTabbar />
    </>
  );
}
