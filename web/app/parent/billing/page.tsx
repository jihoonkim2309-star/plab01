import { ArrowLeft, Bell, ChevronRight } from "lucide-react";
import PortalTabbar from "../PortalTabbar";

const STATUS_COLOR: Record<string, string> = {
  완납: "#1e794e",
  미납: "#b42318",
  대기: "#9ca3af",
};

const MOCK_INVOICES = [
  { id: "i3", month: "2026.06", amount: 320000, status: "대기", dueDate: "2026-06-25" },
  { id: "i2", month: "2026.05", amount: 320000, status: "완납", paidAt: "2026-05-25" },
  { id: "i1", month: "2026.04", amount: 320000, status: "완납", paidAt: "2026-04-25" },
];

const fmt = (n: number) => `₩ ${n.toLocaleString()}`;

export default function ParentBilling() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>결제</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card billing-card">
          <div className="billing-meta"><span>다음 결제일</span><strong>2026.06.25</strong></div>
          <div className="billing-amount"><span>예상 금액</span><strong>₩ 320,000</strong></div>
          <button type="button" className="btn primary" style={{ width: "100%", marginTop: 12 }}>
            지금 결제하기
          </button>
          <p style={{ fontSize: 11, color: "#6f7d78", marginTop: 8, textAlign: "center" }}>
            카드 등록 후 매월 자동 결제됩니다.
          </p>
        </section>

        <section className="card">
          <strong>결제 내역</strong>
          <div style={{ marginTop: 8 }}>
            {MOCK_INVOICES.map((inv) => (
              <a key={inv.id} href={`/parent/billing/${inv.id}`} className="list-row">
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">{inv.month} 수강료</div>
                  <div className="list-row-sub">
                    {inv.status === "완납"
                      ? `${inv.paidAt} 완납`
                      : `납부 마감 ${inv.dueDate ?? "-"}`}
                  </div>
                </div>
                <div style={{ textAlign: "right" }}>
                  <strong style={{ fontSize: 14 }}>{fmt(inv.amount)}</strong>
                  <div style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[inv.status] ?? "#6f7d78", marginTop: 2 }}>
                    {inv.status}
                  </div>
                </div>
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))}
          </div>
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
