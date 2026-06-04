import { ArrowLeft, Bell, CheckCircle2, CreditCard, Plus, Star, Trash2 } from "lucide-react";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PortalTabbar from "../../PortalTabbar";
import { revokeCard, setDefaultCard } from "./actions";

type Card = {
  id: string;
  card_name: string | null;
  card_number_masked: string | null;
  is_default: boolean;
  status: string;
  created_at: string;
};

async function fetchCards(): Promise<Card[]> {
  const h = await headers();
  const ref = h.get("referer") ?? "";
  if (ref.includes("/preview")) return []; // embed → mock 빈 상태
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return [];
  const { data } = await supabase
    .from("billing_keys")
    .select("id, card_name, card_number_masked, is_default, status, created_at")
    .eq("parent_id", session.user.id)
    .neq("status", "revoked")
    .order("is_default", { ascending: false })
    .order("created_at", { ascending: false });
  return (data ?? []) as Card[];
}

export default async function ParentCards({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string }>;
}) {
  const { msg } = await searchParams;
  const cards = await fetchCards();
  return (
    <>
      <div className="portal-topbar">
        <a
          href="/parent/billing"
          style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}
        >
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>결제 카드</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        {msg === "registered" && (
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: 12, background: "var(--brand-soft, #d8ecdf)",
            color: "var(--brand, #1e794e)", borderRadius: 10,
            marginBottom: 12, fontSize: 13, fontWeight: 600,
          }}>
            <CheckCircle2 size={18} />
            카드가 등록되었습니다. 다음 청구일부터 자동 결제됩니다.
          </div>
        )}
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 10 }}>
          등록된 카드로 매월 자동 결제됩니다. 카드 정보는 PortOne 이 안전하게 보관하며, 우리는 토큰만 갖습니다.
        </p>

        {cards.length === 0 ? (
          <section className="card" style={{ padding: 24, textAlign: "center" }}>
            <CreditCard size={42} color="#9ca3af" style={{ margin: "0 auto 10px" }} />
            <strong style={{ display: "block", fontSize: 14 }}>등록된 카드가 없습니다</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 6 }}>
              카드 1장을 등록하면 매월 자동 결제됩니다.
            </p>
          </section>
        ) : (
          <section className="card" style={{ padding: 0 }}>
            {cards.map((c) => (
              <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderTop: "1px solid #f1f5f4" }}>
                <div style={{ width: 44, height: 30, borderRadius: 4, background: c.is_default ? "linear-gradient(120deg, #1e794e, #2a9162)" : "#9ca3af", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700 }}>
                  CARD
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="list-row-title">{c.card_name ?? "카드"}</div>
                  <div className="list-row-sub" style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {c.card_number_masked ?? "**** **** **** ****"}
                  </div>
                </div>
                {c.is_default ? (
                  <span style={{ fontSize: 10, fontWeight: 800, color: "var(--brand)", padding: "2px 6px", background: "var(--brand-soft)", borderRadius: 4, display: "inline-flex", alignItems: "center", gap: 2 }}>
                    <Star size={10} /> 기본
                  </span>
                ) : (
                  <form action={setDefaultCard}>
                    <input type="hidden" name="id" value={c.id} />
                    <button type="submit" style={{ background: "transparent", border: 0, color: "#6f7d78", fontSize: 10, fontWeight: 700, cursor: "pointer", padding: "4px 8px" }}>
                      기본으로
                    </button>
                  </form>
                )}
                <form action={revokeCard}>
                  <input type="hidden" name="id" value={c.id} />
                  <button type="submit" aria-label="해지" style={{ background: "transparent", border: 0, color: "#b42318", cursor: "pointer", padding: 4 }}>
                    <Trash2 size={14} />
                  </button>
                </form>
              </div>
            ))}
          </section>
        )}

        <a
          href="/parent/billing/cards/new"
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 12, color: "var(--brand)", textDecoration: "none", fontWeight: 700, justifyContent: "center", marginTop: 12 }}
        >
          <Plus size={18} />
          카드 등록
        </a>
      </div>
      <PortalTabbar />
    </>
  );
}
