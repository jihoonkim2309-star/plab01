import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

// Edge runtime + Seoul region — cold start 0, Supabase Seoul 과 RTT 최소.
export const runtime = "edge";
export const preferredRegion = "icn1";

// 학생 상세 — nested select 로 1 쿼리. parent_student_links + users + invoices 통합.
// 학생 클릭마다 1 RTT + 1 RLS 평가만 (이전 3 쿼리 → 1).
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const { data, error } = await supabase
    .from("students")
    .select(
      `
      *,
      classes(name, start_time, end_time, days_of_week),
      parent_student_links(status, parent:users(id, name, email, phone)),
      invoices(status, period)
    `,
    )
    .eq("id", id)
    .eq("center_id", centerId)
    .single();

  if (error || !data) {
    return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  // invoices 에서 이번달 가장 최근 status 추출
  const period = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();
  const studentRow = data as unknown as {
    parent_student_links?: {
      status: string;
      parent: { id: string; name: string | null; email: string | null; phone: string | null } | null;
    }[];
    invoices?: { status: string; period: string }[];
  };
  const linkedParents = studentRow.parent_student_links ?? [];
  const currentInvoice = (studentRow.invoices ?? []).find((i) => i.period === period);

  // 학생 본체에서 nested 필드 제거 (응답에서 깔끔하게)
  const studentClean = { ...(data as Record<string, unknown>) };
  delete studentClean.parent_student_links;
  delete studentClean.invoices;

  return Response.json({
    student: studentClean,
    linkedParents,
    currentInvoiceStatus: currentInvoice?.status ?? null,
  });
}
