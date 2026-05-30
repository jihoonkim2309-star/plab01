import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";
import SortHeader from "../SortHeader";
import { ClassDrawerProvider } from "./ClassDrawerContext";
import ClassDetailDrawer from "./ClassDetailDrawer";
import ClassRowLink from "./ClassRowLink";

const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  모집중: "blue",
  마감: "orange",
  종료: "gray",
};

const SORT_WHITELIST = new Set([
  "name",
  "sport",
  "level",
  "coach",
  "capacity",
  "status",
  "created_at",
]);

export default async function ClassesPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    status?: string;
    sport?: string;
    sort?: string;
    dir?: string;
    class?: string;
  }>;
}) {
  const { q, status, sport, sort, dir, class: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const sortKey = sort && SORT_WHITELIST.has(sort) ? sort : "created_at";
  const ascending = sort && SORT_WHITELIST.has(sort) ? dir === "asc" : false;

  let listQuery = supabase
    .from("classes")
    .select("id, name, sport, level, capacity, coach, schedule, status, days_of_week, start_time, end_time, place")
    .eq("center_id", cid)
    .order(sortKey, { ascending });
  if (q) listQuery = listQuery.or(`name.ilike.%${q}%,coach.ilike.%${q}%,sport.ilike.%${q}%`);
  if (status) listQuery = listQuery.eq("status", status);
  if (sport) listQuery = listQuery.eq("sport", sport);

  const [listRes, allRes, studRes, allStudentsRes, productsRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("status").eq("center_id", cid),
    supabase
      .from("students")
      .select("class_id")
      .eq("center_id", cid)
      .eq("status", "정상"),
    supabase
      .from("students")
      .select("id, name")
      .eq("center_id", cid)
      .eq("status", "정상")
      .order("name"),
    supabase
      .from("products")
      .select("id, name, sessions_per_week, price")
      .eq("center_id", cid)
      .eq("active", true)
      .order("sessions_per_week", { ascending: true, nullsFirst: false }),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    operating: all.filter((c) => c.status === "운영").length,
    recruiting: all.filter((c) => c.status === "모집중").length,
    closed: all.filter((c) => c.status === "마감").length,
    ended: all.filter((c) => c.status === "종료").length,
  };

  const countByClass = new Map<string, number>();
  for (const s of studRes.data ?? []) {
    if (s.class_id) countByClass.set(s.class_id, (countByClass.get(s.class_id) ?? 0) + 1);
  }
  const totalAssigned = [...countByClass.values()].reduce((a, b) => a + b, 0);
  const hasFilter = !!(q || status || sport);

  const finalList =
    sort === "students"
      ? [...list].sort((a, b) => {
          const av = countByClass.get(a.id) ?? 0;
          const bv = countByClass.get(b.id) ?? 0;
          return dir === "asc" ? av - bv : bv - av;
        })
      : list;

  const allStudents = (allStudentsRes.data ?? []) as {
    id: string;
    name: string;
  }[];
  const allProducts = (productsRes.data ?? []) as {
    id: string;
    name: string;
    sessions_per_week: number | null;
    price: number | null;
  }[];

  return (
    <ClassDrawerProvider>
      <div className="page-head">
        <div>
          <h1>클래스 관리</h1>
          <p className="subtext">수업 클래스 관리 — 요일·시간·코치·정원</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/classes/new">클래스 생성</Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 클래스</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>모집중</span><strong>{totals.recruiting}</strong></div>
        <div className="summary-card"><span>배정 학생</span><strong>{totalAssigned}</strong></div>
        <div className="summary-card"><span>종료</span><strong>{totals.ended}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              클래스 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${finalList.length}건 / 전체 ${totals.total}` : `${finalList.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "운영", label: "운영" },
                  { value: "모집중", label: "모집중" },
                  { value: "마감", label: "마감" },
                  { value: "종료", label: "종료" },
                ]}
              />
              <FilterSelect
                param="sport"
                current={sport}
                placeholder="종목 전체"
                ariaLabel="종목 필터"
                options={[
                  { value: "배드민턴", label: "배드민턴" },
                  { value: "기초체력", label: "기초체력" },
                  { value: "복합반", label: "복합반" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="이름·코치·종목 검색" />
              {hasFilter && <Link className="btn" href="/admin/classes">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th><SortHeader sortKey="name" label="클래스명" current={sort} dir={dir} /></th>
                <th><SortHeader sortKey="sport" label="종목" current={sort} dir={dir} /></th>
                <th><SortHeader sortKey="coach" label="코치" current={sort} dir={dir} /></th>
                <th><SortHeader sortKey="students" label="수강생" current={sort} dir={dir} /></th>
                <th><SortHeader sortKey="status" label="상태" current={sort} dir={dir} /></th>
              </tr>
            </thead>
            <tbody>
              {finalList.map((c) => (
                <tr key={c.id} className={`row-link-host ${c.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <ClassRowLink
                      classId={c.id}
                      href={`/admin/classes?class=${c.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {c.name}
                    </ClassRowLink>
                  </td>
                  <td className="muted">{c.sport ?? "-"}</td>
                  <td className="muted">{c.coach ?? "-"}</td>
                  <td><span className="badge gray">{countByClass.get(c.id) ?? 0}명</span></td>
                  <td><span className={`badge ${STATUS_BADGE[c.status] ?? "gray"}`}>{c.status}</span></td>
                </tr>
              ))}
              {finalList.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>등록된 클래스가 없습니다</strong>
                          <p>우측 상단 “클래스 생성”으로 첫 클래스를 만드세요.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <ClassDetailDrawer options={{ allStudents, allProducts }} />
      </div>
    </ClassDrawerProvider>
  );
}
