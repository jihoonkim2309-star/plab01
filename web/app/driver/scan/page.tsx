import { ArrowLeft, Bell, QrCode } from "lucide-react";
import DriverTabbar from "../Tabbar";

export default function DriverScan() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/driver" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>차량 QR</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card" style={{ textAlign: "center", padding: 24 }}>
          <p style={{ fontSize: 13, color: "#374151", marginBottom: 14 }}>
            학생이 카메라로 이 QR 을 스캔하면 자동 승·하차 기록.
          </p>
          <div style={{ width: 240, height: 240, margin: "0 auto", background: "#fff", border: "2px solid #111", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <QrCode size={180} strokeWidth={1} />
          </div>
          <div style={{ marginTop: 10, fontSize: 12, color: "#6f7d78" }}>차량: 12가 3456</div>
        </section>

        <section className="card">
          <strong>실시간 승하차</strong>
          <div className="info-rows" style={{ marginTop: 10 }}>
            <div className="info-row"><span>승차</span><strong style={{ color: "var(--brand)" }}>3명</strong></div>
            <div className="info-row"><span>하차</span><strong>0명</strong></div>
          </div>
        </section>
      </div>
      <DriverTabbar />
    </>
  );
}
