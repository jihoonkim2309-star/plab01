import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";

// 학생 상세 + 디테일 패널이 필요한 모든 데이터 한 번에 반환.
// StudentDetailDrawer (client) 가 마운트 시 1회 fetch — 페이지 SSR re-fetch 없이 즉시 표시.
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

  const [studentRes, linkedRes, classesRes, productsRes, routesRes, stopsRes, invoiceRes] =
    await Promise.all([
      supabase
        .from("students")
        .select(
          "*, classes(name, start_time, end_time, days_of_week)",
        )
        .eq("id", id)
        .eq("center_id", centerId)
        .single(),
      supabase
        .from("parent_student_links")
        .select("status, parent:users(id, name, email, phone)")
        .eq("center_id", centerId)
        .eq("student_id", id),
      supabase
        .from("classes")
        .select("id, name, days_of_week")
        .eq("center_id", centerId)
        .in("status", ["운영", "모집중"])
        .order("name"),
      supabase
        .from("products")
        .select("id, name, sessions_per_week, price")
        .eq("center_id", centerId)
        .eq("active", true)
        .order("sessions_per_week", { ascending: true, nullsFirst: false }),
      supabase
        .from("shuttle_routes")
        .select("id, name, direction, runs:shuttle_runs(weekday, start_time, end_time)")
        .eq("center_id", centerId)
        .eq("status", "운영")
        .order("name"),
      supabase
        .from("shuttle_stops")
        .select("id, route_id, sequence, name")
        .eq("center_id", centerId)
        .order("sequence", { ascending: true }),
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
    classes: classesRes.data ?? [],
    products: productsRes.data ?? [],
    routes: routesRes.data ?? [],
    stops: stopsRes.data ?? [],
    currentInvoiceStatus: (invoiceRes.data as { status: string } | null)?.status ?? null,
  });
}
