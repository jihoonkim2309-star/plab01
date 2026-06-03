import { ArrowLeft, Bell, QrCode, ScanLine } from "lucide-react";
import StudentTabbar from "../Tabbar";

export default function StudentShuttle() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/student" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>셔틀</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ textAlign: "center", padding: 24 }}>
          <div style={{
            width: 200,
            height: 200,
            margin: "0 auto",
            background: "#fff",
            border: "2px solid #111",
            borderRadius: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#111",
          }}>
            <QrCode size={140} strokeWidth={1} />
          </div>
          <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 12 }}>
            차량 QR 을 카메라로 비추면 자동 스캔
          </p>
          <button type="button" className="btn primary" style={{ width: "100%", marginTop: 12, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <ScanLine size={16} /> 카메라 열기
          </button>
        </section>

        <section className="card">
          <strong>오늘의 셔틀</strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span>노선</span><strong>강남 1번 노선</strong></div>
            <div className="info-row"><span>승차 정류장</span><strong>한빛초 정문</strong></div>
            <div className="info-row"><span>예정 시각</span><strong>17:10</strong></div>
          </div>
        </section>
      </div>
      <StudentTabbar />
    </>
  );
}
