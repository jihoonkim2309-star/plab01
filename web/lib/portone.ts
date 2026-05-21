import type { SupabaseClient } from "@supabase/supabase-js";

export type CenterPg = {
  storeId: string | null;
  channelKey: string | null;
  apiSecret: string | null;
  mode: string;
};

// 센터의 PortOne 설정 (설정 화면에서 입력한 값) 조회
export async function getCenterPg(
  supabase: SupabaseClient,
  centerId: string,
): Promise<CenterPg> {
  const { data } = await supabase
    .from("centers")
    .select("pg_store_id, pg_channel_key, pg_api_secret, pg_mode")
    .eq("id", centerId)
    .single();
  const c = (data ?? {}) as Record<string, string | null>;
  return {
    storeId: c.pg_store_id ?? null,
    channelKey: c.pg_channel_key ?? null,
    apiSecret: c.pg_api_secret ?? null,
    mode: c.pg_mode ?? "test",
  };
}

export type PortOnePayment = {
  status: string;
  amount: number;
  method: string | null;
  cardName: string | null;
  cardNumberMasked: string | null;
  installmentMonths: number | null;
  approvalNo: string | null;
  receiptUrl: string | null;
  paidAt: string | null;
  raw: unknown;
};

// PortOne V2: 단건 결제 조회로 서버 검증.
// 응답에서 카드 정보·승인번호·영수증 URL 등 풍부한 메타데이터 추출 (POS 매출조회 스타일 상세에 사용).
export async function fetchPortOnePayment(
  apiSecret: string,
  paymentId: string,
): Promise<PortOnePayment | null> {
  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `PortOne ${apiSecret}` }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as Record<string, unknown>;
  const amount = j.amount as { total?: number } | undefined;
  const method = j.method as
    | {
        type?: string;
        card?: { name?: string; number?: string; publisher?: string };
        approvalNumber?: string;
        installment?: { months?: number };
      }
    | undefined;
  const receipt = j.receiptUrl as string | undefined;
  return {
    status: (j.status as string) ?? "UNKNOWN",
    amount: amount?.total ?? 0,
    method: method?.type ?? null,
    cardName: method?.card?.name ?? method?.card?.publisher ?? null,
    cardNumberMasked: method?.card?.number ?? null,
    installmentMonths: method?.installment?.months ?? null,
    approvalNo: method?.approvalNumber ?? null,
    receiptUrl: receipt ?? null,
    paidAt: (j.paidAt as string) ?? null,
    raw: j,
  };
}
