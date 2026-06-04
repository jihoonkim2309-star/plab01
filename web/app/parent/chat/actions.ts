"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 학부모 1:1 채팅 메시지 전송
export async function sendParentChat(formData: FormData) {
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!inquiryId || !body) return;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: inq } = await supabase
    .from("inquiries")
    .select("center_id")
    .eq("id", inquiryId)
    .single();
  const centerId = (inq as { center_id?: string } | null)?.center_id;
  if (!centerId) return;

  await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: inquiryId,
    sender: "customer",
    body,
  });

  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId)
    .eq("status", "접수");

  revalidatePath("/parent/chat/1on1");
  redirect("/parent/chat/1on1");
}
