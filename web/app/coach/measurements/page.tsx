import { ArrowLeft, Bell, ChevronRight, Ruler } from "lucide-react";
import CoachTabbar from "../Tabbar";

const MOCK_STUDENTS = [
  { id: "s1", name: "박도윤", grade: "초3", lastMeasured: "2026-05-20" },
  { id: "s2", name: "강시우", grade: "초6", lastMeasured: "2026-05-22" },
  { id: "s3", name: "장유준", grade: "중3", lastMeasured: null },
];

export default function CoachMeasurements() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/coach" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>측정 입력</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>학생을 선택하면 측정값을 입력할 수 있습니다.</p>
        <section className="card" style={{ padding: 0 }}>
          {MOCK_STUDENTS.map((s) => (
            <a key={s.id} href={`/coach/measurements/${s.id}`} className="list-row" style={{ padding: "14px 16px" }}>
              <div className="avatar" style={{ width: 36, height: 36, fontSize: 14 }}>{s.name.slice(0, 1)}</div>
              <div style={{ flex: 1 }}>
                <div className="list-row-title">{s.name} <span style={{ fontWeight: 500, color: "#6f7d78", fontSize: 11 }}>{s.grade}</span></div>
                <div className="list-row-sub" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <Ruler size={11} /> 마지막 측정: {s.lastMeasured ?? "기록 없음"}
                </div>
              </div>
              <ChevronRight size={16} color="#9ca3af" />
            </a>
          ))}
        </section>
      </div>
      <CoachTabbar />
    </>
  );
}
