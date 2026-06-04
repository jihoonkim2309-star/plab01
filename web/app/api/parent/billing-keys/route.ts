import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// PortOne SDK 가 발급한 빌링키를 서버에 저장.
// 학부모만 호출 가능. 자기 user_id 의 center 또는 parent_student_links 의 center 사용.
export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json()) as { billingKey?: string; raw?: unknown };
  const billingKey = body.billingKey;
  if (!billingKey || typeof billingKey !== "string") {
    return NextResponse.json({ error: "missing_billing_key" }, { status: 400 });
  }

  // 학부모의 연결된 자녀(parent_student_links) 의 center 또는 user.center_id 사용
  const { data: link } = await supabase
    .from("parent_student_links")
    .select("center_id")
    .eq("parent_id", session.user.id)
    .eq("status", "linked")
    .limit(1)
    .maybeSingle();

  let centerId = (link as { center_id?: string } | null)?.center_id ?? null;
  if (!centerId) {
    // pending 인 경우라도 신청한 center
    const { data: pending } = await supabase
      .from("parent_student_links")
      .select("center_id")
      .eq("parent_id", session.user.id)
      .limit(1)
      .maybeSingle();
    centerId = (pending as { center_id?: string } | null)?.center_id ?? null;
  }
  if (!centerId) {
    return NextResponse.json({ error: "no_center_linked" }, { status: 400 });
  }

  // 기존 active 빌링키들의 is_default 해제 (새 카드를 기본으로)
  await supabase
    .from("billing_keys")
    .update({ is_default: false })
    .eq("parent_id", session.user.id)
    .eq("is_default", true);

  // raw 에서 카드 메타 추출 (PortOne 응답 구조 다양 — 안전 fallback)
  const raw = (body.raw ?? {}) as Record<string, unknown>;
  const method = raw.method as
    | { card?: { name?: string; number?: string; issuer?: string }; provider?: string }
    | undefined;
  const cardName = method?.card?.name ?? method?.card?.issuer ?? null;
  const cardNumberMasked = method?.card?.number ?? null;
  const pgProvider = (method?.provider as string) ?? (raw.pgProvider as string) ?? null;

  const { data, error } = await supabase
    .from("billing_keys")
    .insert({
      center_id: centerId,
      parent_id: session.user.id,
      customer_uid: billingKey,
      card_name: cardName,
      card_number_masked: cardNumberMasked,
      pg_provider: pgProvider,
      status: "active",
      is_default: true,
      raw,
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ id: (data as { id: string }).id }, { status: 201 });
}
