import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";
import {
  attachSignedUrls,
  type RawMessageWithAttachments,
} from "@/lib/chat-attachments";

// 본사에 문의 1건 (지점 측) — inquiry + messages 한 번에 + mark_read.
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId, userId } = await requireCenter();

  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: id, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  const [inqRes, msgsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, subject, body, status, created_at")
      .eq("center_id", centerId)
      .eq("kind", "branch_to_hq")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("support_messages")
      .select(
        "id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)",
      )
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const inquiry = inqRes.data as
    | { id: string; subject: string; body: string; status: string; created_at: string }
    | null;
  if (!inquiry) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const messages = await attachSignedUrls(
    supabase,
    (msgsRes.data ?? []) as unknown as RawMessageWithAttachments[],
  );

  return NextResponse.json(
    { inquiry, messages },
    { headers: { "Cache-Control": "no-store" } },
  );
}
