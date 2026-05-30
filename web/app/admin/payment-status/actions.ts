"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 결제 상태 페이지는 read-only (조회 + 영수증 + 이력).
// 결제 처리·환불·청구서 삭제는 모두 청구 관리에서 진행.

// 더미 결제 정보 시드: 결제완료 invoice 인데 payments 가 없거나 카드 정보 비어있는 경우 채워줌.
// 테스트 모드 전용 — 실제 PortOne 결제는 verify route 에서 자동 기록됨.
// RPC 미존재(스키마 재실행 안 됨) 시 throw 대신 URL 파라미터로 에러 전달.
export async function seedDummyPayments() {
  const { supabase, centerId } = await requireCenter();
  const { data, error } = await supabase.rpc("seed_dummy_payments", {
    cid: centerId,
  });
  revalidatePath("/admin/payment-status");
  if (error) {
    const hint =
      error.message.includes("does not exist") ||
      error.code === "PGRST202" ||
      error.code === "42883"
        ? "Supabase SQL Editor 에서 schema.sql 을 재실행해야 합니다 (payments 컬럼 + seed_dummy_payments 함수 등록)."
        : error.message;
    redirect(`/admin/payment-status?seed_error=${encodeURIComponent(hint)}`);
  }
  redirect(`/admin/payment-status?seeded=${data ?? 0}`);
}
