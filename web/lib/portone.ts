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
  raw: unknown;
};

// PortOne V2: 단건 결제 조회로 서버 검증
export async function fetchPortOnePayment(
  apiSecret: string,
  paymentId: string,
): Promise<PortOnePayment | null> {
  const res = await fetch(
    `https://api.portone.io/payments/${encodeURIComponent(paymentId)}`,
    { headers: { Authorization: `PortOne ${apiSecret}` }, cache: "no-store" },
  );
  if (!res.ok) return null;
  const j = (await res.json()) as {
    status?: string;
    amount?: { total?: number };
  };
  return {
    status: j.status ?? "UNKNOWN",
    amount: j.amount?.total ?? 0,
    raw: j,
  };
}
