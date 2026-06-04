import { ArrowLeft, Bell, ChevronRight, CreditCard, Plus } from "lucide-react";
import PortalTabbar from "../../PortalTabbar";

// Phase 1: mock 카드 목록 (실 DB 연동은 다음 phase)
const MOCK_CARDS: {
  id: string;
  cardName: string;
  cardNumberMasked: string;
  isDefault: boolean;
}[] = [];

export default function ParentCards() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/billing" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>결제 카드</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>
          등록된 카드로 매월 자동 결제됩니다. 카드 번호는 PortOne 이 안전하게 보관하며, 우리는 토큰만 갖습니다.
        </p>

        {MOCK_CARDS.length === 0 ? (
          <section className="card" style={{ padding: 24, textAlign: "center" }}>
            <CreditCard size={42} color="#9ca3af" style={{ margin: "0 auto 10px" }} />
            <strong style={{ display: "block", fontSize: 14 }}>등록된 카드가 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6 }}>
              카드 1장을 등록하면 매월 자동 결제됩니다.
            </p>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {MOCK_CARDS.map((c) => (
              <a key={c.id} href={`/parent/billing/cards/${c.id}`} className="list-row" style={{ padding: "14px 16px" }}>
                <div style={{ width: 44, height: 30, borderRadius: 4, background: "linear-gradient(120deg, #1e794e, #2a9162)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                  CARD
                </div>
                <div style={{ flex: 1 }}>
                  <div className="list-row-title">{c.cardName}</div>
                  <div className="list-row-sub">{c.cardNumberMasked}</div>
                </div>
                {c.isDefault && (
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--brand)", padding: "2px 6px", background: "var(--brand-soft)", borderRadius: 4 }}>
                    기본
                  </span>
                )}
                <ChevronRight size={14} color="#9ca3af" />
              </a>
            ))}
          </section>
        )}

        <a
          href="/parent/billing/cards/new"
          className="card"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            color: "var(--brand)",
            textDecoration: "none",
            fontWeight: 700,
            justifyContent: "center",
            marginTop: 12,
          }}
        >
          <Plus size={18} />
          카드 등록
        </a>
      </div>
      <PortalTabbar />
    </>
  );
}
