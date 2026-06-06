import { ArrowLeft, Bell, CheckCircle, Clock, Receipt } from "lucide-react";
import { notFound } from "next/navigation";
import PortalTabbar from "../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";
import PayButton from "./PayButton";

type Invoice = {
  id: string;
  center_id: string;
  student_id: string;
  period: string;
  amount: number;
  status: string;
  due_date: string | null;
  issued_at: string | null;
  paid_at: string | null;
  method: string | null;
  payment_method: string | null;
};
type InvoiceItem = { id: string; label: string; amount: number };
type Center = { name: string; pg_store_id: string | null; pg_channel_key: string | null };

const STATUS_LABEL: Record<string, string> = {
  결제완료: "결제완료",
  환불: "환불",
  실패: "결제 실패",
  대기: "대기",
  청구: "미결제",
};
const STATUS_COLOR: Record<string, string> = {
  결제완료: "#1e794e",
  환불: "#6b7280",
  실패: "#b42318",
  대기: "#9ca3af",
  청구: "#d97706",
};
const METHOD_LABEL: Record<string, string> = {
  parent_portal: "학부모 앱 (자동결제)",
  pg_in_store: "지점 카드 결제",
  offline_cash: "현금",
  offline_card: "카드 (단말기)",
  offline_transfer: "계좌이체",
};

function fmtKRW(n: number) {
  return "₩ " + n.toLocaleString("ko-KR");
}
function fmtDate(iso: string | null) {
  if (!iso) return "—";
  return iso.slice(0, 10).replace(/-/g, ".");
}
function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const yy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${yy}.${mm}.${dd} ${hh}:${mi}`;
}

const MOCK_INVOICE: Invoice = {
  id: "mock",
  center_id: "mock",
  student_id: "mock",
  period: "2026-06",
  amount: 150000,
  status: "청구",
  due_date: "2026-06-10",
  issued_at: "2026-06-01T00:00:00",
  paid_at: null,
  method: null,
  payment_method: null,
};
const MOCK_ITEMS: InvoiceItem[] = [
  { id: "i1", label: "주 3회 정규반", amount: 150000 },
];

async function fetchDetail(id: string): Promise<{
  invoice: Invoice;
  items: InvoiceItem[];
  studentName: string;
  center: Center | null;
} | null> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) {
    return {
      invoice: MOCK_INVOICE,
      items: MOCK_ITEMS,
      studentName: "박도윤",
      center: { name: "플랜비 본점", pg_store_id: null, pg_channel_key: null },
    };
  }
  const { supabase } = guard;
  const { data: inv } = await supabase
    .from("invoices")
    .select(
      "id, center_id, student_id, period, amount, status, due_date, issued_at, paid_at, method, payment_method, students(name)",
    )
    .eq("id", id)
    .maybeSingle();
  type IR = Invoice & { students: { name: string } | null };
  const inq = inv as IR | null;
  if (!inq) return null;

  const { data: itemsRaw } = await supabase
    .from("invoice_items")
    .select("id, label, amount")
    .eq("invoice_id", id);
  const items = (itemsRaw ?? []) as InvoiceItem[];

  const { data: c } = await supabase
    .from("centers")
    .select("name, pg_store_id, pg_channel_key")
    .eq("id", inq.center_id)
    .maybeSingle();
  const center = c as Center | null;

  return {
    invoice: {
      id: inq.id,
      center_id: inq.center_id,
      student_id: inq.student_id,
      period: inq.period,
      amount: inq.amount,
      status: inq.status,
      due_date: inq.due_date,
      issued_at: inq.issued_at,
      paid_at: inq.paid_at,
      method: inq.method,
      payment_method: inq.payment_method,
    },
    items,
    studentName: inq.students?.name ?? "",
    center,
  };
}

export default async function ParentBillingDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await fetchDetail(id);
  if (!detail) notFound();
  const { invoice, items, studentName, center } = detail;
  const isPaid = invoice.status === "결제완료";
  const isRefunded = invoice.status === "환불";
  const isUnpaid = !isPaid && !isRefunded;
  const sLabel = STATUS_LABEL[invoice.status] ?? invoice.status;
  const sColor = STATUS_COLOR[invoice.status] ?? "#6f7d78";
  const periodLabel = invoice.period.replace("-", "년 ") + "월";

  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/billing" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>청구 상세</h1>
        <Bell size={20} />
      </div>

      <div className="portal-content">
        {/* 상태 카드 */}
        <section className="card" style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48, height: 48, borderRadius: "50%",
              background: isPaid ? "#dcfce7" : isRefunded ? "#f3f4f6" : "#fef3c7",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {isPaid ? (
              <CheckCircle size={24} color="#1e794e" />
            ) : isRefunded ? (
              <Receipt size={22} color="#6b7280" />
            ) : (
              <Clock size={22} color="#d97706" />
            )}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: sColor, fontWeight: 700 }}>{sLabel}</div>
            <strong style={{ fontSize: 18 }}>{fmtKRW(invoice.amount)}</strong>
            <div style={{ fontSize: 11, color: "#6f7d78", marginTop: 2 }}>
              {periodLabel} 수강료 · {studentName}
            </div>
          </div>
        </section>

        {/* 청구 정보 */}
        <section className="card">
          <strong style={{ display: "block", fontSize: 13, marginBottom: 10 }}>청구 정보</strong>
          <KV label="청구월" value={periodLabel} />
          <KV label="납부 마감" value={fmtDate(invoice.due_date)} />
          <KV label="청구일" value={fmtDate(invoice.issued_at)} />
          {center && <KV label="지점" value={center.name} />}
        </section>

        {/* 항목 */}
        {items.length > 0 && (
          <section className="card">
            <strong style={{ display: "block", fontSize: 13, marginBottom: 10 }}>청구 항목</strong>
            {items.map((it) => (
              <div key={it.id} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderTop: "1px solid #f1f5f4" }}>
                <span style={{ fontSize: 13 }}>{it.label}</span>
                <span style={{ fontSize: 13, fontWeight: 700 }}>{fmtKRW(it.amount)}</span>
              </div>
            ))}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0 0", borderTop: "2px solid #e5e7eb", marginTop: 6 }}>
              <span style={{ fontSize: 13, color: "#6f7d78" }}>총 금액</span>
              <strong style={{ fontSize: 15, color: "var(--brand)" }}>{fmtKRW(invoice.amount)}</strong>
            </div>
          </section>
        )}

        {/* 결제 정보 (결제완료 시) */}
        {isPaid && (
          <section className="card">
            <strong style={{ display: "block", fontSize: 13, marginBottom: 10 }}>결제 정보</strong>
            <KV label="결제일" value={fmtDateTime(invoice.paid_at)} />
            {invoice.payment_method && (
              <KV label="결제 채널" value={METHOD_LABEL[invoice.payment_method] ?? invoice.payment_method} />
            )}
            {invoice.method && <KV label="결제 수단" value={invoice.method} />}
          </section>
        )}

        {/* 결제 액션 (미결제 시) */}
        {isUnpaid && (
          <PayButton
            invoiceId={invoice.id}
            amount={invoice.amount}
            period={invoice.period}
            studentName={studentName}
            storeId={center?.pg_store_id ?? null}
            channelKey={center?.pg_channel_key ?? null}
          />
        )}
      </div>

      <PortalTabbar />
    </>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "6px 0" }}>
      <span style={{ fontSize: 12, color: "#6f7d78" }}>{label}</span>
      <span style={{ fontSize: 13, color: "#111", fontWeight: 500 }}>{value}</span>
    </div>
  );
}
