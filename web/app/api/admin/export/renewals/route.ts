import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import { toCsv, csvResponse, dateStamp, type Column } from "@/lib/csv";

const pad = (n: number) => String(n).padStart(2, "0");
function nextMonth(ym?: string) {
  if (ym && /^\d{4}-\d{2}$/.test(ym)) return ym;
  const n = new Date();
  const d = new Date(n.getFullYear(), n.getMonth() + 1, 1);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

export async function GET(request: NextRequest) {
  const { supabase, centerId: cid } = await requireCenter();
  const sp = request.nextUrl.searchParams;
  const ym = sp.get("ym") || undefined;
  const q = sp.get("q") || undefined;
  const status = sp.get("status") || undefined;
  const target = nextMonth(ym);

  const qSafe = safeIlike(q);

  // enrollments + 확장 정보
  let enrollQuery = supabase
    .from("enrollments")
    .select(
      "id, student_id, status, attendance_days, students(name, school, grade), products(name, price)",
    )
    .eq("center_id", cid)
    .eq("status", "수강중");
  const { data: enrolls } = await enrollQuery;

  // 그 달 renewal_confirmations
  const { data: rcs } = await supabase
    .from("renewal_confirmations")
    .select("enrollment_id, status, decided_by_role, decided_at, notified_at")
    .eq("center_id", cid)
    .eq("target_month", target);
  const rcMap = new Map(
    (rcs ?? []).map((r) => [
      r.enrollment_id,
      r as {
        enrollment_id: string;
        status: string;
        decided_by_role: string | null;
        decided_at: string | null;
        notified_at: string | null;
      },
    ]),
  );

  type Row = {
    id: string;
    student_id: string;
    status: string;
    attendance_days: string | null;
    students: { name: string | null; school: string | null; grade: string | null } | null;
    products: { name: string | null; price: number | null } | null;
  };

  let rows = (enrolls ?? []) as unknown as Row[];

  // 검색 + 응답 상태 필터
  if (qSafe) {
    const nl = qSafe.toLowerCase();
    rows = rows.filter((r) => {
      const name = (r.students?.name ?? "").toLowerCase();
      const prod = (r.products?.name ?? "").toLowerCase();
      return name.includes(nl) || prod.includes(nl);
    });
  }
  if (status) {
    rows = rows.filter((r) => (rcMap.get(r.id)?.status ?? "대기") === status);
  }

  const columns: Column<Row>[] = [
    { header: "학생", get: (r) => r.students?.name ?? "-" },
    { header: "학교", get: (r) => r.students?.school ?? "" },
    { header: "학년", get: (r) => r.students?.grade ?? "" },
    { header: "상품", get: (r) => r.products?.name ?? "" },
    { header: "금액", get: (r) => r.products?.price ?? "" },
    { header: "참여 요일", get: (r) => r.attendance_days ?? "" },
    { header: `${target} 응답`, get: (r) => rcMap.get(r.id)?.status ?? "대기" },
    { header: "응답자", get: (r) => rcMap.get(r.id)?.decided_by_role ?? "" },
    {
      header: "응답일",
      get: (r) => {
        const da = rcMap.get(r.id)?.decided_at;
        return da ? da.slice(0, 10) : "";
      },
    },
    {
      header: "알림 발송",
      get: (r) => (rcMap.get(r.id)?.notified_at ? "발송" : "미발송"),
    },
  ];

  const csv = toCsv(rows, columns);
  return csvResponse(`수강확인-${target}-${dateStamp()}.csv`, csv);
}
