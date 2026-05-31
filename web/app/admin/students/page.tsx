import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { deleteStudent } from "./actions";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";
import SortHeader from "../SortHeader";
import ExportLink from "../ExportLink";
import AssignEnrollmentModal from "../enrollments/AssignEnrollmentModal";
import AssignShuttleModal from "../shuttle/assignments/AssignShuttleModal";
import { StudentDrawerProvider } from "./StudentDrawerContext";
import StudentDetailDrawer from "./StudentDetailDrawer";
import StudentRowLink from "./StudentRowLink";

const STATUS_BADGE: Record<string, string> = {
  정상: "green",
  상담중: "blue",
  휴원: "orange",
  탈퇴: "gray",
};

const BASIC: [string, string][] = [
  ["성별", "gender"],
  ["생년월일", "birth"],
  ["학교", "school"],
  ["학년", "grade"],
  ["학생 연락처", "phone"],
  ["주소", "address"],
  ["등록일", "created_at"],
];

const ENROLL: [string, string][] = [
  ["수강 클래스", "class_name"],
  ["수강료 상품", "product"],
  ["셔틀 이용", "shuttle_use"],
  ["노선", "route"],
];

const GRADE_OPTIONS = [
  "5세", "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
];

// 정렬 허용 컬럼 — DB 컬럼명 그대로
const SORT_WHITELIST = new Set([
  "name",
  "school",
  "grade",
  "class_name",
  "shuttle_use",
  "status",
  "created_at",
]);

function fmtFieldValue(key: string, val: unknown): string {
  if (val == null || val === "") return "-";
  if (key === "created_at" || key === "updated_at") {
    const s = String(val);
    return s.length >= 10 ? s.slice(0, 10) : s;
  }
  return String(val);
}

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    student?: string;
    q?: string;
    status?: string;
    shuttle?: string;
    grade?: string;
    sort?: string;
    dir?: string;
  }>;
}) {
  const {
    student: selectedId,
    q,
    status,
    shuttle: shuttleFilter,
    grade: gradeFilter,
    sort,
    dir,
  } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 정렬: 화이트리스트에 있는 컬럼만 허용. 기본은 created_at desc.
  const sortKey = sort && SORT_WHITELIST.has(sort) ? sort : "created_at";
  const ascending = sort && SORT_WHITELIST.has(sort) ? dir === "asc" : false;

  // 검색·필터 적용한 목록 + 요약 카운트(필터 무관) + 선택된 학생 상세 + 연결 학부모
  let listQuery = supabase
    .from("students")
    .select(
      "id, name, gender, school, grade, status, class_id, class_name, shuttle_use, photo_url",
    )
    .eq("center_id", cid)
    .order(sortKey, { ascending });
  if (q) {
    listQuery = listQuery.or(`name.ilike.%${q}%,school.ilike.%${q}%`);
  }
  if (status) listQuery = listQuery.eq("status", status);
  if (gradeFilter) listQuery = listQuery.eq("grade", gradeFilter);
  if (shuttleFilter === "이용") listQuery = listQuery.eq("shuttle_use", "이용");
  else if (shuttleFilter === "미이용")
    listQuery = listQuery.or("shuttle_use.is.null,shuttle_use.neq.이용");

  // 우측 디테일은 client (StudentDetailDrawer) 가 fetch — 여기선 좌측 목록 + 옵션 데이터만.
  const [
    listRes,
    summaryRes,
    allClassesRes,
    allProductsRes,
    shuttleRoutesRes,
    shuttleStopsRes,
  ] = await Promise.all([
    listQuery,
    supabase.from("students").select("status, shuttle_use").eq("center_id", cid),
    supabase
      .from("classes")
      .select("id, name, days_of_week")
      .eq("center_id", cid)
      .in("status", ["운영", "모집중"])
      .order("name"),
    supabase
      .from("products")
      .select("id, name, sessions_per_week, price")
      .eq("center_id", cid)
      .eq("active", true)
      .order("sessions_per_week", { ascending: true, nullsFirst: false }),
    supabase
      .from("shuttle_routes")
      .select("id, name, direction, runs:shuttle_runs(weekday, start_time, end_time)")
      .eq("center_id", cid)
      .eq("status", "운영")
      .order("name"),
    supabase
      .from("shuttle_stops")
      .select("id, route_id, sequence, name")
      .eq("center_id", cid)
      .order("sequence", { ascending: true }),
  ]);
  const { data: students, error } = listRes;
  const list = students ?? [];
  // 요약 카드: 필터 무관 전체 기준
  const allRows = summaryRes.data ?? [];
  const totals = {
    total: allRows.length,
    active: allRows.filter((s) => s.status === "정상").length,
    shuttle: allRows.filter((s) => s.shuttle_use === "이용").length,
    consult: allRows.filter((s) => s.status === "상담중").length,
    leave: allRows.filter((s) => s.status === "휴원").length,
    withdrawn: allRows.filter((s) => s.status === "탈퇴").length,
  };
  const allClasses = (allClassesRes.data ?? []) as {
    id: string;
    name: string;
    days_of_week: string | null;
  }[];
  const allProducts = (allProductsRes.data ?? []) as {
    id: string;
    name: string;
    sessions_per_week: number | null;
    price: number | null;
  }[];
  const shuttleRoutes = (shuttleRoutesRes.data ?? []) as {
    id: string;
    name: string;
    direction: string | null;
    runs:
      | { weekday: number; start_time: string; end_time: string | null }[]
      | null;
  }[];
  const shuttleStops = (shuttleStopsRes.data ?? []) as {
    id: string;
    route_id: string;
    sequence: number | null;
    name: string;
  }[];
  const hasActiveFilter = !!(q || status || shuttleFilter || gradeFilter);

  return (
    <StudentDrawerProvider>
      <div className="page-head">
        <div>
          <h1>회원 관리</h1>
          <p className="subtext">학생 정보 등록·수정·검색 + 보호자·계정 연결</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/students/new">
            학생 등록
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 회원</span>
          <strong>{totals.total}</strong>
        </div>
        <div className="summary-card">
          <span>정상 회원</span>
          <strong>{totals.active}</strong>
        </div>
        <div className="summary-card">
          <span>셔틀 이용</span>
          <strong>{totals.shuttle}</strong>
        </div>
        <div className="summary-card">
          <span>상담중</span>
          <strong>{totals.consult}</strong>
        </div>
        <div className="summary-card">
          <span>휴원</span>
          <strong>{totals.leave}</strong>
        </div>
        <div className="summary-card">
          <span>탈퇴</span>
          <strong>{totals.withdrawn}</strong>
        </div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              학생 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasActiveFilter
                  ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                  : `${list.length}건`}
              </span>
            </p>
            <div className="toolbar">
              <ExportLink
                href={`/api/admin/export/students?${(() => {
                  const p = new URLSearchParams();
                  if (q) p.set("q", q);
                  if (status) p.set("status", status);
                  if (shuttleFilter) p.set("shuttle", shuttleFilter);
                  if (gradeFilter) p.set("grade", gradeFilter);
                  if (sort) p.set("sort", sort);
                  if (dir) p.set("dir", dir);
                  return p.toString();
                })()}`}
              />
            </div>
          </div>

          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "정상", label: "정상" },
                  { value: "상담중", label: "상담중" },
                  { value: "휴원", label: "휴원" },
                  { value: "탈퇴", label: "탈퇴" },
                ]}
              />
              <FilterSelect
                param="shuttle"
                current={shuttleFilter}
                placeholder="셔틀 전체"
                ariaLabel="셔틀 필터"
                options={[
                  { value: "이용", label: "이용" },
                  { value: "미이용", label: "미이용" },
                ]}
              />
              <FilterSelect
                param="grade"
                current={gradeFilter}
                placeholder="학년 전체"
                ariaLabel="학년 필터"
                options={GRADE_OPTIONS.map((g) => ({ value: g, label: g }))}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="이름·학교 검색" />
              {hasActiveFilter && (
                <Link className="btn" href="/admin/students">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>

          {error && (
            <div className="panel-body">
              <div className="field-error-text">
                목록을 불러오지 못했습니다: {error.message}
              </div>
            </div>
          )}

          <div className="list-scroll">
          <table className="member-table">
            <thead>
              <tr>
                <th>
                  <SortHeader
                    sortKey="name"
                    label="이름"
                    current={sort}
                    dir={dir}
                  />
                </th>
                <th>
                  <SortHeader
                    sortKey="school"
                    label="학교/학년"
                    current={sort}
                    dir={dir}
                  />
                </th>
                <th>
                  <SortHeader
                    sortKey="class_name"
                    label="클래스"
                    current={sort}
                    dir={dir}
                  />
                </th>
                <th>
                  <SortHeader
                    sortKey="shuttle_use"
                    label="셔틀"
                    current={sort}
                    dir={dir}
                  />
                </th>
                <th>
                  <SortHeader
                    sortKey="status"
                    label="상태"
                    current={sort}
                    dir={dir}
                  />
                </th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr
                  key={s.id}
                  className="row-link-host"
                >
                  <td>
                    <StudentRowLink
                      studentId={s.id}
                      href={`/admin/students?student=${s.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {s.name}
                    </StudentRowLink>
                  </td>
                  <td className="muted">
                    {[s.school, s.grade].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="muted">
                    {s.class_id && s.class_name ? (
                      <Link
                        href={`/admin/classes/${s.class_id}/edit`}
                        style={{ color: "var(--text)" }}
                      >
                        {s.class_name}
                      </Link>
                    ) : (
                      (s.class_name ?? "-")
                    )}
                  </td>
                  <td>
                    {s.shuttle_use === "이용" ? (
                      <span className="badge green">이용</span>
                    ) : (
                      <span className="badge gray">미이용</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${STATUS_BADGE[s.status] ?? "gray"}`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <strong>등록된 학생이 없습니다</strong>
                      <p>우측 상단 “학생 등록”으로 첫 학생을 추가하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </div>
        </div>

        <StudentDetailDrawer
          options={{
            classes: allClasses,
            products: allProducts,
            routes: shuttleRoutes,
            stops: shuttleStops,
          }}
        />
      </div>
    </StudentDrawerProvider>
  );
}
