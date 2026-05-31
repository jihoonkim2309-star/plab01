import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

export const runtime = "edge";
export const preferredRegion = "icn1";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const [invoiceRes, itemsRes, paymentsRes] = await Promise.all([
    supabase
      .from("invoices")
      .select(
        "id, period, amount, status, source, due_date, paid_at, issued_at, method, pg_tx_id, center_id, students(id, name)",
      )
      .eq("center_id", centerId)
      .eq("id", id)
      .single(),
    supabase
      .from("invoice_items")
      .select("id, label, amount")
      .eq("center_id", centerId)
      .eq("invoice_id", id),
    supabase
      .from("payments")
      .select(
        "id, amount, status, provider, pg_tx_id, method, card_name, card_number_masked, installment_months, approval_no, receipt_url, failed_reason, paid_at, created_at",
      )
      .eq("center_id", centerId)
      .eq("invoice_id", id)
      .order("created_at", { ascending: false }),
  ]);

  if (invoiceRes.error || !invoiceRes.data) {
    return Response.json({ error: "청구서를 찾을 수 없습니다." }, { status: 404 });
  }

  // center 정보 (영수증용)
  const { data: center } = await supabase
    .from("centers")
    .select("name, address, contact_phone")
    .eq("id", centerId)
    .single();

  return Response.json({
    invoice: invoiceRes.data,
    items: itemsRes.data ?? [],
    payments: paymentsRes.data ?? [],
    center: center ?? null,
  });
}
