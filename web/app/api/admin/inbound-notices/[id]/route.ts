import { NextResponse } from "next/server";
import { requireCenter } from "@/lib/center";

// 본사 공지 1건 client fetch — 진입 시 멱등 mark_read 도 함께
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId, userId } = await requireCenter();

  await supabase
    .from("hq_notice_reads")
    .upsert(
      { notice_id: id, center_id: centerId, user_id: userId },
      { onConflict: "notice_id,user_id" },
    );

  const { data } = await supabase
    .from("hq_notices")
    .select("id, title, body, scope, published_at")
    .eq("id", id)
    .maybeSingle();

  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(data, {
    headers: { "Cache-Control": "no-store" },
  });
}
