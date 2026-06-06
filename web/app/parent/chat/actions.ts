"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

// 학부모 게시글 답변 스레드 메시지 전송 (sender='customer')
export async function sendParentPostReply(formData: FormData) {
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!inquiryId || !body) return;

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/user/login");

  const { data: inq } = await supabase
    .from("inquiries")
    .select("center_id")
    .eq("id", inquiryId)
    .eq("created_by", session.user.id)
    .single();
  const centerId = (inq as { center_id?: string } | null)?.center_id;
  if (!centerId) return;

  await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: inquiryId,
    sender: "customer",
    body,
  });

  revalidatePath(`/parent/chat/post/${inquiryId}`);
}

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

  // RLS inquiries_parent_own_read 로 본인 created_by 만 select 가능
  const { data: inq } = await supabase
    .from("inquiries")
    .select("center_id")
    .eq("id", inquiryId)
    .eq("created_by", session.user.id)
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
