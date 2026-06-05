"use server";

import { revalidatePath } from "next/cache";
import { requireCenter, requireSuperAdmin } from "@/lib/center";
import type { SupabaseClient } from "@supabase/supabase-js";

async function ensureBranchChatInquiry(
  supabase: SupabaseClient,
  centerId: string,
): Promise<string> {
  const { data: existing } = await supabase
    .from("inquiries")
    .select("id")
    .eq("center_id", centerId)
    .eq("kind", "branch_chat")
    .maybeSingle();
  if (existing) return (existing as { id: string }).id;

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      center_id: centerId,
      kind: "branch_chat",
      channel: "웹",
      subject: "본사 채팅",
      body: "",
      status: "접수",
    })
    .select("id")
    .single();
  if (error) throw new Error("채팅방 생성 실패: " + error.message);
  return (data as { id: string }).id;
}

// 메시지 INSERT 후 첨부 파일 업로드 + attachment row insert.
async function uploadAttachments(
  supabase: SupabaseClient,
  args: { messageId: string; centerId: string; files: File[] },
) {
  for (const file of args.files) {
    if (!file || file.size === 0) continue;
    if (file.size > 10 * 1024 * 1024) continue; // 10MB 초과 skip
    const safeName = file.name.replace(/[\\/]/g, "_");
    const path = `${args.messageId}/${crypto.randomUUID()}-${safeName}`;
    const { error: upErr } = await supabase.storage
      .from("chat-attachments")
      .upload(path, file, { contentType: file.type || undefined });
    if (upErr) continue;
    await supabase.from("support_message_attachments").insert({
      message_id: args.messageId,
      center_id: args.centerId,
      storage_path: path,
      file_name: file.name,
      mime_type: file.type || null,
      size_bytes: file.size,
    });
  }
}

export async function sendBranchChatAsAdmin(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (!body && realFiles.length === 0) throw new Error("내용을 입력해 주세요.");

  const inquiryId = await ensureBranchChatInquiry(supabase, centerId);
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

  if (realFiles.length > 0) {
    await uploadAttachments(supabase, { messageId, centerId, files: realFiles });
  }

  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId);

  revalidatePath("/admin/branch-chat");
  revalidatePath("/admin/hq-chat");
}

export async function sendBranchChatAsHq(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const centerId = String(formData.get("center_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (!centerId) throw new Error("지점이 선택되지 않았습니다.");
  if (!body && realFiles.length === 0) throw new Error("내용을 입력해 주세요.");

  const inquiryId = await ensureBranchChatInquiry(supabase, centerId);
  const { data: msgIns, error } = await supabase
    .from("support_messages")
    .insert({
      center_id: centerId,
      inquiry_id: inquiryId,
      sender: "hq",
      body: body || "",
    })
    .select("id")
    .single();
  if (error) throw new Error("전송 실패: " + error.message);
  const messageId = (msgIns as { id: string }).id;

  if (realFiles.length > 0) {
    await uploadAttachments(supabase, { messageId, centerId, files: realFiles });
  }

  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId);

  revalidatePath("/admin/hq-chat");
  revalidatePath("/admin/branch-chat");
}
