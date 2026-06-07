"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// 메시지 INSERT 후 첨부 업로드 + attachment row insert (학부모 채팅과 동일 패턴)
async function uploadAttachments(
  supabase: SupabaseClient,
  args: { messageId: string; centerId: string; files: File[] },
) {
  for (const file of args.files) {
    if (!file || file.size === 0) continue;
    if (file.size > 10 * 1024 * 1024) continue;
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

// 코치 1:1 채팅 답장 — sender='admin' (지점측). RLS(smsg_coach_insert) 가
// 본인 담당 클래스 학부모의 inquiry 인지 검증한다. 텍스트 + 첨부(10MB).
export async function sendCoachChat(formData: FormData) {
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (!inquiryId || (!body && realFiles.length === 0)) return;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/staff/login");

  // RLS 로 열람 가능한 inquiry 만 center_id 회수 (스코프 밖이면 null → 무시)
  const { data: inq } = await supabase
    .from("inquiries")
    .select("center_id")
    .eq("id", inquiryId)
    .maybeSingle();
  const centerId = (inq as { center_id?: string } | null)?.center_id;
  if (!centerId) return;

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

  // 진입/전송 시점 읽음 처리 (멱등)
  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: inquiryId, user_id: session.user.id, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  revalidatePath(`/coach/chat/${inquiryId}`);
  revalidatePath("/coach/chat");
}
