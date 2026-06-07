"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 코치 1:1 채팅 답장 — sender='admin' (지점측). RLS(smsg_coach_insert) 가
// 본인 담당 클래스 학부모의 inquiry 인지 검증한다. 텍스트 전용 (v1).
export async function sendCoachChat(formData: FormData) {
  const inquiryId = String(formData.get("inquiry_id") ?? "");
  const body = String(formData.get("body") ?? "").trim();
  if (!inquiryId || !body) return;

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

  const { error } = await supabase.from("support_messages").insert({
    center_id: centerId,
    inquiry_id: inquiryId,
    sender: "admin",
    body,
  });
  if (error) throw new Error("전송 실패: " + error.message);

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
