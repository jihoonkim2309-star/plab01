import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";
import {
  attachSignedUrls,
  type RawMessageWithAttachments,
} from "@/lib/chat-attachments";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId, userId } = await requireCenter();

  // 진입 시 자동 mark_read — 사이드바 뱃지 자동 감소
  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: id, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  const [inqRes, msgsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, requester_name, contact, channel, subject, status, created_at")
      .eq("center_id", centerId)
      .eq("kind", "chat")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("support_messages")
      .select(
        "id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)",
      )
      .eq("center_id", centerId)
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!inqRes.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  const messages = await attachSignedUrls(
    supabase,
    (msgsRes.data ?? []) as unknown as RawMessageWithAttachments[],
  );
  return NextResponse.json(
    { inquiry: inqRes.data, messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}
