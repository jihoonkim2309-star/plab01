"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

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
