import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/center";
import {
  attachSignedUrls,
  type RawMessageWithAttachments,
} from "@/lib/chat-attachments";

// 플로팅 위젯 (프랜차이즈 모드) — 특정 지점과의 본사 채팅 스레드.
// branch_chat inquiry find-or-create + 메시지 + 진입 mark_read. (hq 관점)
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ centerId: string }> },
) {
  const { centerId } = await params;
  const { supabase, userId } = await requireSuperAdmin();

  const { data: center } = await supabase
    .from("centers")
    .select("name")
    .eq("id", centerId)
    .maybeSingle();

  let { data: inq } = await supabase
    .from("inquiries")
    .select("id, status")
    .eq("center_id", centerId)
    .eq("kind", "branch_chat")
    .maybeSingle();
  if (!inq) {
    const { data: created } = await supabase
      .from("inquiries")
      .insert({
        center_id: centerId,
        kind: "branch_chat",
        channel: "웹",
        subject: "본사 채팅",
        body: "",
        status: "접수",
      })
      .select("id, status")
      .single();
    inq = created;
  }
  if (!inq) return NextResponse.json({ error: "no_channel" }, { status: 500 });
  const inquiryId = (inq as { id: string }).id;

  const { data: rawMsgs } = await supabase
    .from("support_messages")
    .select(
      "id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)",
    )
    .eq("center_id", centerId)
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });
  const messages = await attachSignedUrls(
    supabase,
    (rawMsgs ?? []) as unknown as RawMessageWithAttachments[],
  );

  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: inquiryId, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  return NextResponse.json(
    {
      inquiry: {
        id: inquiryId,
        centerId,
        name: (center as { name: string } | null)?.name ?? "지점",
      },
      messages,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
