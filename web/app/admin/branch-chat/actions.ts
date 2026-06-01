"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter, requireSuperAdmin } from "@/lib/center";
import type { SupabaseClient } from "@supabase/supabase-js";

// 지점당 단일 branch_chat inquiry 행 멱등 ensure → id 반환.
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

// 지점 admin 측 — 자기 지점 채널로 메시지 발송
export async function sendBranchChatAsAdmin(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const body = String(formData.get("body") ?? "").trim();
  if (!body) throw new Error("내용을 입력해 주세요.");

  const inquiryId = await ensureBranchChatInquiry(supabase, centerId);
  const { error } = await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: inquiryId,
    sender: "admin",
    body,
  });
  if (error) throw new Error("전송 실패: " + error.message);

  // updated_at 갱신 (정렬용)
  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId);

  revalidatePath("/admin/branch-chat");
  revalidatePath("/admin/hq-chat");
  redirect("/admin/branch-chat");
}

// 본사 측 — 특정 지점 채널로 메시지 발송
export async function sendBranchChatAsHq(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const centerId = String(formData.get("center_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!centerId) throw new Error("지점이 선택되지 않았습니다.");
  if (!body) throw new Error("내용을 입력해 주세요.");

  const inquiryId = await ensureBranchChatInquiry(supabase, centerId);
  const { error } = await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: inquiryId,
    sender: "hq",
    body,
  });
  if (error) throw new Error("전송 실패: " + error.message);

  await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId);

  revalidatePath("/admin/hq-chat");
  revalidatePath("/admin/branch-chat");
  redirect(`/admin/hq-chat?center=${centerId}`);
}
