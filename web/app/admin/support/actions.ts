"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function createInquiry(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const subject = String(formData.get("subject") ?? "");
  if (!subject) throw new Error("제목은 필수입니다.");

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      center_id: centerId,
      requester_name: String(formData.get("requester_name") ?? "") || null,
      contact: String(formData.get("contact") ?? "") || null,
      channel: String(formData.get("channel") ?? "웹"),
      subject,
      body: String(formData.get("body") ?? "") || null,
    })
    .select("id")
    .single();
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/support");
  redirect(`/admin/support?sel=${(data as { id: string }).id}`);
}

export async function replyMessage(inquiryId: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) return redirect(`/admin/support?sel=${inquiryId}`);

  const { error } = await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: inquiryId,
    sender: "admin",
    body,
  });
  if (error) throw new Error("전송 실패: " + error.message);

  // 답변하면 상태를 '처리중'으로
  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId)
    .eq("status", "접수");

  revalidatePath("/admin/support");
  redirect(`/admin/support?sel=${inquiryId}`);
}

export async function setInquiryStatus(id: string, status: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);
  revalidatePath("/admin/support");
  redirect(`/admin/support?sel=${id}`);
}

export async function deleteInquiry(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/support");
  redirect("/admin/support");
}
