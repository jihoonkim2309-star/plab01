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

  const [detailRes, notifRes] = await Promise.all([
    supabase.rpc("get_student_detail", { p_id: id }),
    supabase
      .from("notifications")
      .select("id, kind, template, payload, status, created_at, sent_at, error")
      .or(`payload->>target_student_id.eq.${id},payload->>student_id.eq.${id}`)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (detailRes.error) {
    const err = detailRes.error;
    if (err.message?.includes("forbidden")) {
      return Response.json({ error: "권한이 없습니다." }, { status: 403 });
    }
    if (err.message?.includes("student not found")) {
      return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json({ error: err.message }, { status: 500 });
  }

  const data = (detailRes.data ?? {}) as Record<string, unknown>;
  data.recentNotifications = notifRes.data ?? [];
  return Response.json(data);
}
