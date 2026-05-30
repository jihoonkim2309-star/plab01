import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

export const runtime = "edge";
export const preferredRegion = "icn1";

// 리포트 상세 — 단일 row + 학생 정보.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const { data, error } = await supabase
    .from("reports")
    .select(
      "id, student_id, report_month, report_type, status, coach_comment, admin_comment, public_to_parent, published_at, students(name)",
    )
    .eq("id", id)
    .eq("center_id", centerId)
    .single();

  if (error || !data) {
    return Response.json({ error: "리포트를 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json({ report: data });
}
