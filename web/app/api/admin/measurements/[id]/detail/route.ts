import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

export const runtime = "edge";
export const preferredRegion = "icn1";

// 측정 데이터 상세 — 학생 + 그 달 measurement + values.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ym = request.nextUrl.searchParams.get("ym");
  if (!ym || !/^\d{4}-\d{2}$/.test(ym)) {
    return Response.json({ error: "ym 잘못됨" }, { status: 400 });
  }
  const tA = Date.now();
  const { supabase, centerId } = await requireCenter();
  console.log("[measurement/detail] requireCenter", Date.now() - tA, "ms");
  const tQ = Date.now();

  const [studentRes, measurementRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, school, grade, gender, birth, status")
      .eq("id", id)
      .eq("center_id", centerId)
      .single(),
    supabase
      .from("measurements")
      .select("id, status, measured_at, reviewed_at, reject_reason, notes")
      .eq("center_id", centerId)
      .eq("student_id", id)
      .eq("measurement_month", ym)
      .maybeSingle(),
  ]);

  if (studentRes.error || !studentRes.data) {
    return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  let values: { item_id: string; value_num: number | null; value_text: string | null }[] = [];
  const m = measurementRes.data as { id: string } | null;
  if (m?.id) {
    const { data } = await supabase
      .from("measurement_values")
      .select("item_id, value_num, value_text")
      .eq("measurement_id", m.id);
    values = (data ?? []) as typeof values;
  }
  console.log("[measurement/detail] queries", Date.now() - tQ, "ms");

  return Response.json({
    student: studentRes.data,
    measurement: measurementRes.data,
    values,
  });
}
