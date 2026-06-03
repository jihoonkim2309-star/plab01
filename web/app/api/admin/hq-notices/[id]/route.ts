import { NextResponse } from "next/server";
import { requireSuperAdmin } from "@/lib/center";

// 본사 공지 1건 상세 (super_admin) — 공지 본문 + 지점별 열람 현황
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireSuperAdmin();

  const [noticeRes, readsRes, centersRes] = await Promise.all([
    supabase
      .from("hq_notices")
      .select(
        "id, title, body, scope, target_center_ids, published_at, notified_count, created_at",
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("hq_notice_reads")
      .select("center_id, user_id, read_at")
      .eq("notice_id", id)
      .order("read_at", { ascending: true }),
    supabase.from("centers").select("id, name").order("name"),
  ]);

  if (!noticeRes.data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json(
    {
      notice: noticeRes.data,
      reads: readsRes.data ?? [],
      centers: centersRes.data ?? [],
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
