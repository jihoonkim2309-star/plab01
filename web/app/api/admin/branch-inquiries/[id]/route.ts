import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";

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
      .select("id, sender, body, created_at")
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true }),
  ]);

  const inquiry = inqRes.data as
    | { id: string; subject: string; body: string; status: string; created_at: string }
    | null;
  if (!inquiry) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    { inquiry, messages: msgsRes.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
