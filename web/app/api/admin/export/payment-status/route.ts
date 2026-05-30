import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import { toCsv, csvResponse, dateStamp, type Column } from "@/lib/csv";

const CHANNEL_LABELS: Record<string, string> = {
  parent_portal: "포털",
  pg_in_store: "PG",
  offline_cash: "현금",
  offline_card: "단말",
  offline_transfer: "이체",
};

export async function GET(request: NextRequest) {
  const { supabase, centerId: cid } = await requireCenter();
  const sp = request.nextUrl.searchParams;
  const s = sp.get("s") || undefined;
  const q = sp.get("q") || undefined;

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
    .select("period, amount, status, paid_at, due_date, payment_method, students(name)")
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (s) query = query.eq("status", s);
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
    paid_at: string | null;
    due_date: string | null;
    payment_method: string | null;
    students: { name: string } | null;
  };

  const columns: Column<Row>[] = [
    { header: "학생", get: (r) => r.students?.name ?? "-" },
    { header: "청구월", get: (r) => r.period },
    { header: "금액", get: (r) => r.amount },
    { header: "상태", get: (r) => r.status },
    { header: "결제 채널", get: (r) => (r.payment_method ? (CHANNEL_LABELS[r.payment_method] ?? r.payment_method) : "") },
    { header: "납기일", get: (r) => r.due_date ?? "" },
    { header: "결제일시", get: (r) => r.paid_at ?? "" },
  ];

  const csv = toCsv((data ?? []) as unknown as Row[], columns);
  return csvResponse(`결제상태-${dateStamp()}.csv`, csv);
}
