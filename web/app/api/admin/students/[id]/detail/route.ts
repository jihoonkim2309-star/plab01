import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

// Edge runtime + Seoul region — cold start 0, Supabase Seoul 과 RTT 최소.
export const runtime = "edge";
export const preferredRegion = "icn1";

// 학생 상세 — Supabase RPC `get_student_detail` 1회 호출.
// 함수는 SECURITY DEFINER → RLS 우회 + 내부 권한 검증.
// nested RLS 평가 ~5번 → 권한 검증 1번 → 응답 시간 큰 폭 단축.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase } = await requireCenter();

  const { data, error } = await supabase.rpc("get_student_detail", { p_id: id });

  if (error) {
    if (error.message?.includes("forbidden")) {
      return Response.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (error.message?.includes("student not found")) {
      return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json(data);
}
