import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

// 학생 상세 — student + linkedParents + currentInvoiceStatus 만 (3 쿼리).
// 옵션 데이터 (classes/products/routes/stops) 는 page.tsx 가 server-side 에서
// 한 번 fetch 해서 props 로 전달 — 학생 클릭마다 재호출 없음.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { supabase, centerId } = await requireCenter();

  const period = (() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}`;
  })();

  const [studentRes, linkedRes, invoiceRes] = await Promise.all([
    supabase
      .from("students")
      .select("*, classes(name, start_time, end_time, days_of_week)")
      .eq("id", id)
      .eq("center_id", centerId)
      .single(),
    supabase
      .from("parent_student_links")
      .select("status, parent:users(id, name, email, phone)")
      .eq("center_id", centerId)
      .eq("student_id", id),
    supabase
      .from("invoices")
      .select("status")
      .eq("center_id", centerId)
      .eq("student_id", id)
      .eq("period", period)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  if (studentRes.error || !studentRes.data) {
    return Response.json({ error: "학생을 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json({
    student: studentRes.data,
    linkedParents: linkedRes.data ?? [],
    currentInvoiceStatus: (invoiceRes.data as { status: string } | null)?.status ?? null,
  });
}
