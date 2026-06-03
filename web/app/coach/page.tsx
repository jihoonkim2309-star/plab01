import { Bell, ChevronRight, Clock, Users } from "lucide-react";
import CoachTabbar from "./Tabbar";

const MOCK_CLASSES = [
  { id: "c1", name: "정규반 A", time: "16:00 - 17:00", count: 12 },
  { id: "c2", name: "정규반 B", time: "17:30 - 18:30", count: 10 },
  { id: "c3", name: "고급반", time: "19:00 - 20:00", count: 8 },
];

export default function CoachHome() {
  return (
    <>
      <div className="portal-topbar">
        <h1>플랜비 코치</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>오늘의 클래스</h2>
        {MOCK_CLASSES.map((c) => (
          <a key={c.id} href={`/coach/attendance?class=${c.id}`} className="card" style={{ display: "flex", alignItems: "center", gap: 14, textDecoration: "none", color: "#111" }}>
            <div style={{ width: 44, height: 44, borderRadius: 10, background: "var(--brand-soft)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--brand)" }}>
              <Clock size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{c.name}</strong>
              <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2, display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Clock size={12} /> {c.time} · <Users size={12} /> {c.count}명
              </div>
            </div>
            <ChevronRight size={18} color="#9ca3af" />
          </a>
        ))}
      </div>
      <CoachTabbar />
    </>
  );
}
