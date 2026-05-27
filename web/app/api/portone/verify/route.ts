import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCenterPg, fetchPortOnePayment } from "@/lib/portone";

// 결제창 성공 후 클라이언트가 호출 → 서버에서 PortOne 조회로 검증.
export async function POST(request: NextRequest) {
  const { paymentId, invoiceId } = await request.json();
  if (!paymentId || !invoiceId)
    return NextResponse.json({ error: "bad request" }, { status: 400 });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: inv } = await supabase
    .from("invoices")
    .select("id, center_id, amount, status")
    .eq("id", invoiceId)
    .single();
  if (!inv)
    return NextResponse.json({ error: "invoice not found" }, { status: 404 });

  const pg = await getCenterPg(supabase, inv.center_id as string);
  if (!pg.apiSecret)
    return NextResponse.json({ error: "PG 미설정" }, { status: 400 });

  const pay = await fetchPortOnePayment(pg.apiSecret, paymentId);
  if (!pay)
    return NextResponse.json({ error: "조회 실패" }, { status: 502 });

  if (pay.status !== "PAID" || pay.amount < Number(inv.amount)) {
    await supabase.from("payments").insert({
      center_id: inv.center_id,
      invoice_id: inv.id,
      amount: pay.amount,
      status: "실패",
      provider: "portone",
      pg_tx_id: paymentId,
      failed_reason: `status=${pay.status} amount=${pay.amount}`,
      raw: pay.raw as object,
    });
    return NextResponse.json(
      { error: `미결제 (status=${pay.status})` },
      { status: 409 },
    );
  }

  const nowIso = new Date().toISOString();

  await supabase
    .from("invoices")
    .update({
      status: "결제완료",
      paid_at: pay.paidAt ?? nowIso,
      method: pay.method ?? "card",
      payment_method: "pg_in_store",
      pg_tx_id: paymentId,
    })
    .eq("id", inv.id);

  await supabase.from("payments").insert({
    center_id: inv.center_id,
    invoice_id: inv.id,
    amount: pay.amount,
    status: "성공",
    provider: "portone",
    pg_tx_id: paymentId,
    method: pay.method,
    card_name: pay.cardName,
    card_number_masked: pay.cardNumberMasked,
    installment_months: pay.installmentMonths,
    approval_no: pay.approvalNo,
    receipt_url: pay.receiptUrl,
    paid_at: pay.paidAt ?? nowIso,
    raw: pay.raw as object,
  });

  return NextResponse.json({ ok: true });
}
