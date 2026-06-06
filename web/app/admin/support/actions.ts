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
  if (data?.kind === "chat") return "/admin/support/chats";
  if (data?.kind === "offline") return "/admin/support/offline";
  return "/admin/support/posts";
}

// 어드민이 전화·방문 문의를 직접 기록 (kind='offline' 고정)
export async function createOfflineInquiry(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const subject = String(formData.get("subject") ?? "").trim();
  if (!subject) {
    redirect("/admin/support/offline?error=subject");
  }

  const channel = String(formData.get("channel") ?? "전화");
  const requesterName = String(formData.get("requester_name") ?? "").trim() || null;
  const contact = String(formData.get("contact") ?? "").trim() || null;
  const body = String(formData.get("body") ?? "").trim() || null;

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      center_id: centerId,
      kind: "offline",
      channel,
      requester_name: requesterName,
      contact,
      subject,
      body,
    })
    .select("id")
    .single();
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/support/offline");
  redirect(`/admin/support/offline?sel=${(data as { id: string }).id}`);
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
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (!body && realFiles.length === 0) return redirect(dest);

  const { data: msgIns, error } = await supabase
    .from("support_messages")
    .insert({
      center_id: centerId,
      inquiry_id: inquiryId,
      sender: "admin",
      body: body || "",
    })
    .select("id")
    .single();
  if (error) throw new Error("전송 실패: " + error.message);
  const messageId = (msgIns as { id: string }).id;

  // 첨부 업로드 + attachment row
  for (const file of realFiles) {
    if (file.size > 10 * 1024 * 1024) continue;
    const safeName = file.name.replace(/[\\/]/g, "_");
    const path = `${messageId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type || undefined });
    if (upErr) continue;
    await supabase.from("support_message_attachments").insert({
      message_id: messageId,
      center_id: centerId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    });
  }

  // 답변하면 상태를 '처리중'으로
  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId)
    .eq("center_id", centerId)
    .eq("status", "접수");

  revalidatePath(basePath);
  redirect(dest);
}

export async function setInquiryStatus(
  id: string,
  status: string,
  formData: FormData,
) {
  const { supabase, centerId } = await requireCenter();
  const back = formData.get("back");
  const basePath = await pathForInquiry(supabase, id);
  const dest = safeBack(
    typeof back === "string" ? back : null,
    `${basePath}?sel=${id}`,
  );

  const { error } = await supabase
    .from("inquiries")
    .update({ status })
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("처리 실패: " + error.message);
  revalidatePath(basePath);
  redirect(dest);
}

export async function deleteInquiry(id: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const back = formData.get("back");
  const basePath = await pathForInquiry(supabase, id);
  const dest = safeBack(typeof back === "string" ? back : null, basePath);

  const { error } = await supabase
    .from("inquiries")
    .delete()
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath(basePath);
  redirect(dest);
}
