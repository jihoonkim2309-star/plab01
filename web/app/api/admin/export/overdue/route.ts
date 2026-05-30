import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import { toCsv, csvResponse, dateStamp, type Column } from "@/lib/csv";

function daysOver(due: string | null): number {
  if (!due) return 0;
  const d = new Date(due + "T00:00:00");
  const now = new Date();
  return Math.floor((now.getTime() - d.getTime()) / 86400000);
}
function bucketKey(n: number) {
  if (n >= 30) return "long";
  if (n >= 7) return "d7";
  if (n >= 3) return "d3";
  if (n >= 1) return "d1";
  return "today";
}
function bucketLabel(n: number) {
  if (n >= 30) return "장기(30일+)";
  if (n >= 7) return "7-29일";
  if (n >= 3) return "3-6일";
  if (n >= 1) return "1-2일";
  return "당일";
}

export async function GET(request: NextRequest) {
  const { supabase, centerId: cid } = await requireCenter();
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") || undefined;
  const bucket = sp.get("bucket") || undefined;
  const today = new Date().toISOString().slice(0, 10);

  const qSafe = safeIlike(q);
  let studentFilter: string[] | null = null;
  if (qSafe) {
    const { data: matched } = await supabase
      .from("students")
      .select("id")
      .eq("center_id", cid)
      .ilike("name", `%${qSafe}%`);
    studentFilter = (matched ?? []).map((m) => m.id);
  }

  let query = supabase
    .from("invoices")
    .select("period, amount, status, due_date, students(name)")
    .eq("center_id", cid)
    .in("status", ["청구", "실패"])
    .lt("due_date", today)
    .order("due_date", { ascending: true });
  if (studentFilter !== null) {
    if (studentFilter.length === 0)
      query = query.eq("id", "00000000-0000-0000-0000-000000000000");
    else query = query.in("student_id", studentFilter);
  }

  const { data, error } = await query;
  if (error) return new Response("export 실패: " + error.message, { status: 500 });

  type Row = {
    period: string;
    amount: number;
    status: string;
    due_date: string | null;
    students: { name: string } | null;
  };

  let rows = (data ?? []) as unknown as Row[];
  if (bucket) rows = rows.filter((r) => bucketKey(daysOver(r.due_date)) === bucket);

  const columns: Column<Row>[] = [
    { header: "학생", get: (r) => r.students?.name ?? "-" },
    { header: "청구월", get: (r) => r.period },
    { header: "금액", get: (r) => r.amount },
    { header: "납기일", get: (r) => r.due_date ?? "" },
    { header: "경과(일)", get: (r) => daysOver(r.due_date) },
    { header: "경과 구간", get: (r) => bucketLabel(daysOver(r.due_date)) },
    { header: "상태", get: (r) => r.status },
  ];

  const csv = toCsv(rows, columns);
  return csvResponse(`미납-${dateStamp()}.csv`, csv);
}
