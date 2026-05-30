import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

export const runtime = "edge";
export const preferredRegion = "icn1";

// 클래스 상세 + 수강 학생 명단 (status='정상' 만).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const [classRes, studentsRes] = await Promise.all([
    supabase
      .from("classes")
      .select(
        "id, name, sport, level, capacity, coach, schedule, status, days_of_week, start_time, end_time, place",
      )
      .eq("id", id)
      .eq("center_id", centerId)
      .single(),
    supabase
      .from("students")
      .select("id, name, attendance_days, status")
      .eq("center_id", centerId)
      .eq("class_id", id)
      .eq("status", "정상")
      .order("name"),
  ]);

  if (classRes.error || !classRes.data) {
    return Response.json({ error: "클래스를 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json({
    class: classRes.data,
    students: studentsRes.data ?? [],
  });
}
