"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

// 학부모/학생 자기 inquiry 한정 — 본인 created_by 인지 확인 + center_id 반환
async function getOwnedInquiry(
  supabase: SupabaseClient,
  inquiryId: string,
  userId: string,
): Promise<string | null> {
  const { data: inq } = await supabase
    .from("inquiries")
    .select("center_id")
    .eq("id", inquiryId)
    .eq("created_by", userId)
    .maybeSingle();
  return (inq as { center_id?: string } | null)?.center_id ?? null;
}

// 메시지 INSERT 후 첨부 업로드 + attachment row insert (어드민 채팅과 동일 패턴)
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

// 학부모 게시글 문의 작성 (kind='post')
export async function createParentPost(formData: FormData) {
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject) throw new Error("제목을 입력해 주세요.");

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/user/login");

  const { data: profile } = await supabase
    .from("users")
    .select("center_id, name")
    .eq("id", session.user.id)
    .single();
  const centerId = (profile as { center_id?: string } | null)?.center_id;
  const parentName = (profile as { name?: string } | null)?.name ?? null;
  if (!centerId) throw new Error("지점 정보를 찾을 수 없습니다.");

  await supabase.from("inquiries").insert({
    center_id: centerId,
    kind: "post",
    channel: "앱",
    subject,
    body,
    requester_name: parentName,
    status: "접수",
    created_by: session.user.id,
  });

  revalidatePath("/parent/chat/post");
  redirect("/parent/chat/post");
}

// 학부모 게시글 답변 스레드 메시지 + 첨부 (sender='customer')
export async function sendParentPostReply(formData: FormData) {
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (!inquiryId || (!body && realFiles.length === 0)) return;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/user/login");

  const centerId = await getOwnedInquiry(supabase, inquiryId, session.user.id);
  if (!centerId) return;

  const { data: msgIns, error } = await supabase
    .from("support_messages")
    .insert({
      center_id: centerId,
      inquiry_id: inquiryId,
      sender: "customer",
      body: body || "",
    })
    .select("id")
    .single();
  if (error) throw new Error("전송 실패: " + error.message);
  const messageId = (msgIns as { id: string }).id;

  if (realFiles.length > 0) {
    await uploadAttachments(supabase, { messageId, centerId, files: realFiles });
  }

  revalidatePath(`/parent/chat/post/${inquiryId}`);
}

// 학부모 1:1 채팅 메시지 + 첨부. redirect 제거 (revalidatePath 만 — same-path navigate 깜박임 회피)
export async function sendParentChat(formData: FormData) {
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const files = formData.getAll("files") as File[];
  const realFiles = files.filter((f): f is File => f instanceof File && f.size > 0);
  if (!inquiryId || (!body && realFiles.length === 0)) return;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/user/login");

  const centerId = await getOwnedInquiry(supabase, inquiryId, session.user.id);
  if (!centerId) return;

  const { data: msgIns, error } = await supabase
    .from("support_messages")
    .insert({
      center_id: centerId,
      inquiry_id: inquiryId,
      sender: "customer",
      body: body || "",
    })
    .select("id")
    .single();
  if (error) throw new Error("전송 실패: " + error.message);
  const messageId = (msgIns as { id: string }).id;

  if (realFiles.length > 0) {
    await uploadAttachments(supabase, { messageId, centerId, files: realFiles });
  }

  // 고객 메시지 → 접수/완료 inquiry 를 처리중으로 (완료 채팅에 답하면 재오픈 →
  //  어드민 뱃지에 다시 잡힘. 완료는 미열람 뱃지서 제외되므로 이 재오픈이 필수).
  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId)
    .in("status", ["접수", "완료"]);

  revalidatePath("/parent/chat/1on1");
  revalidatePath("/admin/branch-chat");
}
