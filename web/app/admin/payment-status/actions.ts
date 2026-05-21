"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 일괄 상태 변경 (목록 상단 [선택 결제완료/실패/환불])
export async function setPaymentStatus(formData: FormData) {
  const { supabase } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const status = String(formData.get("status") ?? "");
  if (ids.length === 0) throw new Error("선택된 항목이 없습니다.");
  if (!["대기", "청구", "결제완료", "실패", "환불"].includes(status))
    throw new Error("잘못된 상태입니다.");

  const { error } = await supabase
    .from("invoices")
    .update({
      status,
      paid_at: status === "결제완료" ? new Date().toISOString() : null,
    })
    .in("id", ids);
  if (error) throw new Error("처리 실패: " + error.message);

  revalidatePath("/admin/payment-status");
  redirect("/admin/payment-status");
}

// 우측 상세 패널에서 단건 상태 변경 — 변경 후 그 청구서가 선택된 상태로 복귀.
export async function setInvoiceStatusInDetail(id: string, status: string) {
  const { supabase } = await requireCenter();
  if (!["대기", "청구", "결제완료", "실패", "환불"].includes(status))
    throw new Error("잘못된 상태입니다.");

  const patch: Record<string, string | null> = { status };
  patch.paid_at = status === "결제완료" ? new Date().toISOString() : null;

  const { error } = await supabase.from("invoices").update(patch).eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);

  revalidatePath("/admin/payment-status");
  redirect(`/admin/payment-status?inv=${id}`);
}

// 우측 상세 패널에서 삭제 — 삭제 후 목록만 (선택 해제)
export async function deleteInvoiceInDetail(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("invoices").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/payment-status");
  redirect("/admin/payment-status");
}

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
