"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function bulkOverdueAction(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const action = String(formData.get("action") ?? "");
  if (ids.length === 0) throw new Error("선택된 항목이 없습니다.");
  if (!["재청구", "알림", "결제완료"].includes(action))
    throw new Error("잘못된 작업입니다.");

  if (action === "결제완료") {
    const { error } = await supabase
      .from("invoices")
      .update({ status: "결제완료", paid_at: new Date().toISOString() })
      .in("id", ids)
      .eq("center_id", centerId);
    if (error) throw new Error("처리 실패: " + error.message);
  } else {
    if (action === "재청구") {
      await supabase
        .from("invoices")
        .update({ status: "청구" })
        .in("id", ids)
        .eq("center_id", centerId);
    }
    const logs = ids.map((invoice_id) => ({
      center_id: centerId,
      invoice_id,
      action,
      memo: action === "재청구" ? "재청구 처리" : "미납 알림 발송 표시",
    }));
    const { error } = await supabase.from("overdue_actions").insert(logs);
    if (error) throw new Error("기록 실패: " + error.message);
  }

  revalidatePath("/admin/overdue");
  redirect("/admin/overdue");
}
