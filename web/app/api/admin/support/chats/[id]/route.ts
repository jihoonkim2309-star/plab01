import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

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
      .select("id, sender, body, created_at")
      .eq("center_id", centerId)
      .eq("inquiry_id", id)
      .order("created_at", { ascending: true }),
  ]);

  if (!inqRes.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    { inquiry: inqRes.data, messages: msgsRes.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
