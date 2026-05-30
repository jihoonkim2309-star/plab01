import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import { resolveBillingMonth } from "@/lib/billing";
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
  const ym = sp.get("ym") || undefined;
  const status = sp.get("status") || undefined;
  const q = sp.get("q") || undefined;

  let period: string;
  if (ym && /^\d{4}-\d{2}$/.test(ym)) {
    period = ym;
  } else {
    const { data: center } = await supabase
      .from("centers")
      .select("renewal_check_day")
      .eq("id", cid)
      .single();
    const day = (center as { renewal_check_day: number | null } | null)
      ?.renewal_check_day ?? null;
    period = resolveBillingMonth(day).period;
  }

  const qSafe = safeIlike(q);
  let studentFilter: string[] | null = null;
  if (qSafe) {
    const { data: matched } = await supabase
      .from("students")
      .select("id")
      .eq("center_id", cid)
      .ilike("name", `%${qSafe}%`);
    studentFilter = (matched ?? []).map((s) => s.id);
  }

  let listQuery = supabase
    .from("invoices")
    .select(
      "amount, status, source, due_date, paid_at, payment_method, students(name)",
    )
    .eq("center_id", cid)
    .eq("period", period)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (studentFilter !== null) {
    if (studentFilter.length === 0)
      listQuery = listQuery.eq("id", "00000000-0000-0000-0000-000000000000");
    else listQuery = listQuery.in("student_id", studentFilter);
  }

  const { data, error } = await listQuery;
  if (error) return new Response("export 실패: " + error.message, { status: 500 });

  type Row = {
    amount: number;
    status: string;
    source: string;
    due_date: string | null;
    paid_at: string | null;
    payment_method: string | null;
    students: { name: string } | null;
  };

  const columns: Column<Row>[] = [
    { header: "학생", get: (r) => r.students?.name ?? "-" },
    { header: "청구월", get: () => period },
    { header: "금액", get: (r) => r.amount },
    { header: "상태", get: (r) => r.status },
    { header: "결제 채널", get: (r) => (r.payment_method ? (CHANNEL_LABELS[r.payment_method] ?? r.payment_method) : "") },
    { header: "출처", get: (r) => r.source },
    { header: "납기일", get: (r) => r.due_date ?? "" },
    { header: "결제일", get: (r) => (r.paid_at ? r.paid_at.slice(0, 10) : "") },
  ];

  const csv = toCsv((data ?? []) as unknown as Row[], columns);
  return csvResponse(`청구-${period}-${dateStamp()}.csv`, csv);
}
