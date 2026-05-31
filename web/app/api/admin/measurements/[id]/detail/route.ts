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

  // student + measurement(+ values join) 병렬 — 2 round trip
  const [studentRes, measurementRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, name, school, grade, gender, birth, status")
      .eq("id", id)
      .eq("center_id", centerId)
      .single(),
    supabase
      .from("measurements")
      .select(
        "id, status, measured_at, reviewed_at, reject_reason, notes, measurement_values(item_id, value_num, value_text)",
      )
      .eq("center_id", centerId)
      .eq("student_id", id)
      .eq("measurement_month", ym)
      .maybeSingle(),
  ]);

  if (studentRes.error || !studentRes.data) {
    return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  const mRaw = measurementRes.data as
    | {
        id: string;
        status: string;
        measured_at: string | null;
        reviewed_at: string | null;
        reject_reason: string | null;
        notes: string | null;
        measurement_values: {
          item_id: string;
          value_num: number | null;
          value_text: string | null;
        }[] | null;
      }
    | null;
  const values = mRaw?.measurement_values ?? [];
  const measurement = mRaw
    ? {
        id: mRaw.id,
        status: mRaw.status,
        measured_at: mRaw.measured_at,
        reviewed_at: mRaw.reviewed_at,
        reject_reason: mRaw.reject_reason,
        notes: mRaw.notes,
      }
    : null;
  console.log("[measurement/detail] queries", Date.now() - tQ, "ms");

  return Response.json({
    student: studentRes.data,
    measurement,
    values,
  });
}
