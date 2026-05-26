"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 안전한 fallback 경로 — kind 모를 때 게시글 화면으로
function safeBack(raw: string | null, fallback: string): string {
  if (!raw) return fallback;
  // 외부 사이트 리다이렉트 방지 — 내부 경로만 허용
  if (!raw.startsWith("/admin/support/")) return fallback;
  return raw;
}

async function pathForInquiry(
  supabase: Awaited<ReturnType<typeof requireCenter>>["supabase"],
  inquiryId: string,
): Promise<string> {
  const { data } = await supabase
    .from("inquiries")
    .select("kind")
    .eq("id", inquiryId)
    .maybeSingle();
  return data?.kind === "chat" ? "/admin/support/chats" : "/admin/support/posts";
}

export async function replyMessage(inquiryId: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const back = formData.get("back");
  const basePath = await pathForInquiry(supabase, inquiryId);
  const dest = safeBack(
    typeof back === "string" ? back : null,
    `${basePath}?sel=${inquiryId}`,
  );

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return redirect(dest);

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

  revalidatePath(basePath);
  redirect(dest);
}

export async function setInquiryStatus(
  id: string,
  status: string,
  formData: FormData,
) {
  const { supabase } = await requireCenter();
  const back = formData.get("back");
  const basePath = await pathForInquiry(supabase, id);
  const dest = safeBack(
    typeof back === "string" ? back : null,
    `${basePath}?sel=${id}`,
  );

  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);
  revalidatePath(basePath);
  redirect(dest);
}

export async function deleteInquiry(id: string, formData: FormData) {
  const { supabase } = await requireCenter();
  const back = formData.get("back");
  const basePath = await pathForInquiry(supabase, id);
  const dest = safeBack(typeof back === "string" ? back : null, basePath);

  const { error } = await supabase.from("inquiries").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath(basePath);
  redirect(dest);
}
