import { ArrowLeft, Bell, Clock } from "lucide-react";
import StudentTabbar from "../Tabbar";

const MOCK_WEEK = [
  { day: "월", items: [{ time: "16:00 - 17:00", className: "정규반 A", coach: "박코치" }] },
  { day: "화", items: [] },
  { day: "수", items: [{ time: "16:00 - 17:00", className: "정규반 A", coach: "박코치" }] },
  { day: "목", items: [] },
  { day: "금", items: [{ time: "16:00 - 17:00", className: "정규반 A", coach: "박코치" }] },
  { day: "토", items: [] },
  { day: "일", items: [] },
];

export default function StudentSchedule() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/student" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>시간표</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {MOCK_WEEK.map((w) => (
          <section key={w.day} className="card" style={{ padding: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: w.items.length ? "var(--brand)" : "#f1f5f4", color: w.items.length ? "#fff" : "#9ca3af", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 13 }}>
                {w.day}
              </div>
              <div style={{ flex: 1 }}>
                {w.items.length === 0 ? (
                  <div style={{ fontSize: 12, color: "#9ca3af" }}>수업 없음</div>
                ) : (
                  w.items.map((it, i) => (
                    <div key={i}>
                      <strong style={{ fontSize: 13 }}>{it.className}</strong>
                      <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Clock size={12} /> {it.time} · {it.coach}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
      <StudentTabbar />
    </>
  );
}
