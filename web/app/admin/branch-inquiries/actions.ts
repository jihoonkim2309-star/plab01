"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 지점 → 본사 문의 작성
export async function createBranchInquiry(formData: FormData) {
  const { supabase, centerId, userId } = await requireCenter();
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  if (!subject) throw new Error("제목을 입력해 주세요.");
  if (!body) throw new Error("본문을 입력해 주세요.");

  const { data, error } = await supabase
    .from("inquiries")
    .insert({
      center_id: centerId,
      kind: "branch_to_hq",
      channel: "웹",
      subject,
      body,
      status: "접수",
      assignee: null,
    })
    .select("id")
    .single();
  if (error) throw new Error("문의 생성 실패: " + error.message);

  // 첫 메시지 = body 로 자동 등록 (스레드 시작)
  await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: (data as { id: string }).id,
    sender: "admin",
    body,
  });
  void userId;

  revalidatePath("/admin/branch-inquiries");
  revalidatePath("/admin/hq-inquiries");
  redirect(`/admin/branch-inquiries?id=${(data as { id: string }).id}`);
}

// 지점·본사 양측 답변 (sender 자동 결정)
export async function replyBranchInquiry(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  const senderRole = String(formData.get("sender_role") ?? "admin");
  if (!inquiryId || !body) throw new Error("내용을 입력해 주세요.");
  if (senderRole !== "admin" && senderRole !== "hq")
    throw new Error("잘못된 발신자입니다.");

  const { data: inq } = await supabase
    .from("inquiries")
    .select("center_id")
    .eq("id", inquiryId)
    .single();
  if (!inq) throw new Error("문의를 찾을 수 없습니다.");
  const cid = (inq as { center_id: string }).center_id;

  const { error } = await supabase.from("support_messages").insert({
    center_id: cid,
    inquiry_id: inquiryId,
    sender: senderRole,
    body,
  });
  if (error) throw new Error("답변 실패: " + error.message);

  // 본사가 답변하면 status='처리중' 자동 전환 (접수→처리중)
  if (senderRole === "hq") {
    await supabase
      .from("inquiries")
      .update({ status: "처리중" })
      .eq("id", inquiryId)
      .eq("status", "접수");
  }

  revalidatePath("/admin/branch-inquiries");
  revalidatePath("/admin/hq-inquiries");
  const back =
    senderRole === "hq"
      ? `/admin/hq-inquiries?id=${inquiryId}`
      : `/admin/branch-inquiries?id=${inquiryId}`;
  void centerId;
  redirect(back);
}

export async function closeBranchInquiry(formData: FormData) {
  const { supabase } = await requireCenter();
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  if (!inquiryId) throw new Error("id 가 비어 있습니다.");
  const { error } = await supabase
    .from("inquiries")
    .update({ status: "완료" })
    .eq("id", inquiryId);
  if (error) throw new Error("완료 처리 실패: " + error.message);
  revalidatePath("/admin/branch-inquiries");
  revalidatePath("/admin/hq-inquiries");
  redirect(`/admin/branch-inquiries?id=${inquiryId}`);
}

export async function reopenBranchInquiry(formData: FormData) {
  const { supabase } = await requireCenter();
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  if (!inquiryId) throw new Error("id 가 비어 있습니다.");
  const { error } = await supabase
    .from("inquiries")
    .update({ status: "처리중" })
    .eq("id", inquiryId);
  if (error) throw new Error("재오픈 실패: " + error.message);
  revalidatePath("/admin/branch-inquiries");
  revalidatePath("/admin/hq-inquiries");
  redirect(`/admin/branch-inquiries?id=${inquiryId}`);
}
