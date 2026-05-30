import { type NextRequest } from "next/server";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import { toCsv, csvResponse, dateStamp, type Column } from "@/lib/csv";

// 회원 목록 — 페이지의 필터(q/status/shuttle/grade) + 정렬(sort/dir) 그대로 적용해 CSV 반환.
export async function GET(request: NextRequest) {
  const { supabase, centerId } = await requireCenter();
  const sp = request.nextUrl.searchParams;
  const q = sp.get("q") || undefined;
  const status = sp.get("status") || undefined;
  const shuttleFilter = sp.get("shuttle") || undefined;
  const gradeFilter = sp.get("grade") || undefined;
  const sort = sp.get("sort") || undefined;
  const dir = sp.get("dir") || undefined;

  const SORT_WHITELIST = new Set([
    "name",
    "school",
    "grade",
    "class_name",
    "shuttle_use",
    "status",
    "created_at",
  ]);
  const sortKey = sort && SORT_WHITELIST.has(sort) ? sort : "created_at";
  const ascending = sort && SORT_WHITELIST.has(sort) ? dir === "asc" : false;

  let query = supabase
    .from("students")
    .select(
      "name, gender, birth, school, grade, sport, level, status, class_name, product, shuttle_use, route, phone, address, parent1_name, parent1_phone, parent2_name, parent2_phone, memo, created_at",
    )
    .eq("center_id", centerId)
    .order(sortKey, { ascending });
  const qSafe = safeIlike(q);
  if (qSafe) {
    query = query.or(`name.ilike.%${qSafe}%,school.ilike.%${qSafe}%`);
  }
  if (status) query = query.eq("status", status);
  if (gradeFilter) query = query.eq("grade", gradeFilter);
  if (shuttleFilter === "이용") query = query.eq("shuttle_use", "이용");
  else if (shuttleFilter === "미이용")
    query = query.or("shuttle_use.is.null,shuttle_use.neq.이용");

  const { data, error } = await query;
  if (error) {
    return new Response("export 실패: " + error.message, { status: 500 });
  }

  type Row = {
    name: string | null;
    gender: string | null;
    birth: string | null;
    school: string | null;
    grade: string | null;
    sport: string | null;
    level: string | null;
    status: string | null;
    class_name: string | null;
    product: string | null;
    shuttle_use: string | null;
    route: string | null;
    phone: string | null;
    address: string | null;
    parent1_name: string | null;
    parent1_phone: string | null;
    parent2_name: string | null;
    parent2_phone: string | null;
    memo: string | null;
    created_at: string | null;
  };

  const columns: Column<Row>[] = [
    { header: "이름", get: (r) => r.name },
    { header: "성별", get: (r) => r.gender },
    { header: "생년월일", get: (r) => r.birth },
    { header: "학교", get: (r) => r.school },
    { header: "학년", get: (r) => r.grade },
    { header: "종목", get: (r) => r.sport },
    { header: "레벨", get: (r) => r.level },
    { header: "상태", get: (r) => r.status },
    { header: "클래스", get: (r) => r.class_name },
    { header: "상품", get: (r) => r.product },
    { header: "셔틀 이용", get: (r) => r.shuttle_use },
    { header: "노선", get: (r) => r.route },
    { header: "학생 연락처", get: (r) => r.phone },
    { header: "주소", get: (r) => r.address },
    { header: "보호자1 이름", get: (r) => r.parent1_name },
    { header: "보호자1 연락처", get: (r) => r.parent1_phone },
    { header: "보호자2 이름", get: (r) => r.parent2_name },
    { header: "보호자2 연락처", get: (r) => r.parent2_phone },
    { header: "메모", get: (r) => r.memo },
    {
      header: "등록일",
      get: (r) => (r.created_at ? r.created_at.slice(0, 10) : ""),
    },
  ];

  const csv = toCsv((data ?? []) as Row[], columns);
  return csvResponse(`회원-${dateStamp()}.csv`, csv);
}
