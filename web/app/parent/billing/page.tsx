import { ArrowLeft, Bell, ChevronRight, CreditCard } from "lucide-react";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

const STATUS_COLOR: Record<string, string> = {
  paid: "#1e794e",
  overdue: "#b42318",
  failed: "#b42318",
  pending: "#9ca3af",
};
const STATUS_LABEL: Record<string, string> = {
  paid: "완납",
  pending: "대기",
  overdue: "연체",
  failed: "실패",
};

type Invoice = {
  id: string;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
};

const MOCK_INVOICES: Invoice[] = [
  { id: "i3", amount: 320000, status: "pending", due_date: "2026-06-25", paid_at: null },
  { id: "i2", amount: 320000, status: "paid", due_date: "2026-05-25", paid_at: "2026-05-25" },
  { id: "i1", amount: 320000, status: "paid", due_date: "2026-04-25", paid_at: "2026-04-25" },
];

const fmt = (n: number) => `₩ ${(n ?? 0).toLocaleString()}`;
const ym = (d: string | null) => (d ? d.slice(0, 7).replace("-", ".") : "-");

async function fetchInvoices(): Promise<{ invoices: Invoice[]; nextDue: Invoice | null }> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) {
    return {
      invoices: MOCK_INVOICES,
      nextDue: MOCK_INVOICES.find((i) => i.status === "pending") ?? null,
    };
  }
  const { supabase, userId } = guard;
  // 본인 자녀 student_id 들
  const { data: links } = await supabase
    .from("parent_student_links")
    .select("student_id")
    .eq("parent_id", userId)
    .eq("status", "linked")
    .not("student_id", "is", null);
  const studentIds = ((links ?? []) as { student_id: string }[]).map((l) => l.student_id);
  if (studentIds.length === 0) return { invoices: [], nextDue: null };

  const { data } = await supabase
    .from("invoices")
    .select("id, amount, status, due_date, paid_at")
    .in("student_id", studentIds)
    .order("due_date", { ascending: false })
    .limit(24);
  const invoices = (data ?? []) as Invoice[];
  const nextDue = invoices
    .filter((i) => i.status === "pending" || i.status === "overdue")
    .sort((a, b) => (a.due_date ?? "").localeCompare(b.due_date ?? ""))[0] ?? null;
  return { invoices, nextDue };
}

export default async function ParentBilling() {
  const { invoices, nextDue } = await fetchInvoices();
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
        <a
          href="/parent/billing/cards"
          className="card"
          style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#111" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--brand-soft)", color: "var(--brand)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <CreditCard size={18} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 14 }}>결제 카드</strong>
            <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>
              자동 결제용 카드 등록·관리
            </div>
          </div>
          <ChevronRight size={16} color="#9ca3af" />
        </a>

        {nextDue ? (
          <section className="card billing-card">
            <div className="billing-meta">
              <span>다음 결제일</span>
              <strong>{nextDue.due_date ?? "-"}</strong>
            </div>
            <div className="billing-amount">
              <span>예상 금액</span>
              <strong>{fmt(nextDue.amount)}</strong>
            </div>
            <p style={{ fontSize: 11, color: "#6f7d78", marginTop: 8, textAlign: "center" }}>
              카드 등록 후 매월 자동 결제됩니다.
            </p>
          </section>
        ) : (
          <section className="card" style={{ background: "#fafafa", textAlign: "center" }}>
            <p style={{ fontSize: 13, color: "#6f7d78" }}>예정된 결제가 없습니다.</p>
          </section>
        )}

        <section className="card">
          <strong>결제 내역</strong>
          <div style={{ marginTop: 8 }}>
            {invoices.length === 0 ? (
              <p style={{ fontSize: 12, color: "#6f7d78", padding: "8px 0" }}>
                내역이 없습니다.
              </p>
            ) : (
              invoices.map((inv) => (
                <a key={inv.id} href={`/parent/billing/${inv.id}`} className="list-row">
                  <div style={{ flex: 1 }}>
                    <div className="list-row-title">{ym(inv.due_date)} 수강료</div>
                    <div className="list-row-sub">
                      {inv.status === "paid"
                        ? `${inv.paid_at?.slice(0, 10) ?? ""} 완납`
                        : `납부 마감 ${inv.due_date ?? "-"}`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <strong style={{ fontSize: 14 }}>{fmt(inv.amount)}</strong>
                    <div style={{ fontSize: 11, fontWeight: 700, color: STATUS_COLOR[inv.status] ?? "#6f7d78", marginTop: 2 }}>
                      {STATUS_LABEL[inv.status] ?? inv.status}
                    </div>
                  </div>
                  <ChevronRight size={14} color="#9ca3af" />
                </a>
              ))
            )}
          </div>
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
