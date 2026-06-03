import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/center";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, userId } = await requireSuperAdmin();

  await supabase
    .from("inquiry_reads")
    .upsert(
      { inquiry_id: id, user_id: userId, last_read_at: new Date().toISOString() },
      { onConflict: "inquiry_id,user_id" },
    );

  const [inqRes, msgsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, subject, body, status, center_id, centers(name), created_at")
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
    | {
        id: string;
        subject: string;
        body: string;
        status: string;
        center_id: string;
        centers: { name: string } | null;
        created_at: string;
      }
    | null;
  if (!inquiry) return NextResponse.json({ error: "not_found" }, { status: 404 });

  return NextResponse.json(
    { inquiry, messages: msgsRes.data ?? [] },
    { headers: { "Cache-Control": "no-store" } },
  );
}
