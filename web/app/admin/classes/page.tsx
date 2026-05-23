import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";
import SortHeader from "../SortHeader";

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
  }>;
}) {
  const { q, status, sport, sort, dir } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const sortKey = sort && SORT_WHITELIST.has(sort) ? sort : "created_at";
  const ascending = sort && SORT_WHITELIST.has(sort) ? dir === "asc" : false;

  let listQuery = supabase
    .from("classes")
    .select("id, name, sport, level, capacity, coach, schedule, status")
    .eq("center_id", cid)
    .order(sortKey, { ascending });
  if (q) listQuery = listQuery.or(`name.ilike.%${q}%,coach.ilike.%${q}%,sport.ilike.%${q}%`);
  if (status) listQuery = listQuery.eq("status", status);
  if (sport) listQuery = listQuery.eq("sport", sport);

  const [listRes, allRes, studRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("status").eq("center_id", cid),
    supabase.from("students").select("class_id").eq("center_id", cid),
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

  // 학생수 정렬은 DB 컬럼이 아니라 후처리 (필요한 경우)
  const finalList =
    sort === "students"
      ? [...list].sort((a, b) => {
          const av = countByClass.get(a.id) ?? 0;
          const bv = countByClass.get(b.id) ?? 0;
          return dir === "asc" ? av - bv : bv - av;
        })
      : list;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>클래스 관리</h1>
          <p className="subtext">실제 DB 연동 · 학생 등록의 수강 클래스 드롭다운에 연결됨</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/classes/new">
            클래스 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 클래스</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>운영중</span><strong>{totals.operating}</strong></div>
        <div className="summary-card"><span>모집중</span><strong>{totals.recruiting}</strong></div>
        <div className="summary-card"><span>배정 학생</span><strong>{totalAssigned}</strong></div>
        <div className="summary-card"><span>종료</span><strong>{totals.ended}</strong></div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">
            클래스 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${finalList.length}건 / 전체 ${totals.total}`
                : `${finalList.length}건`}
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
            {hasFilter && (
              <Link className="btn" href="/admin/classes">
                초기화
              </Link>
            )}
          </FilterBar>
        </div>

        {listRes.error && (
          <div className="panel-body">
            <div className="field-error-text">
              목록을 불러오지 못했습니다: {listRes.error.message}
            </div>
          </div>
        )}

        <table className="class-table">
          <thead>
            <tr>
              <th><SortHeader sortKey="name" label="클래스명" current={sort} dir={dir} /></th>
              <th><SortHeader sortKey="sport" label="종목" current={sort} dir={dir} /></th>
              <th><SortHeader sortKey="level" label="레벨" current={sort} dir={dir} /></th>
              <th>일정</th>
              <th><SortHeader sortKey="coach" label="코치" current={sort} dir={dir} /></th>
              <th><SortHeader sortKey="capacity" label="정원" current={sort} dir={dir} /></th>
              <th><SortHeader sortKey="students" label="수강생" current={sort} dir={dir} /></th>
              <th><SortHeader sortKey="status" label="상태" current={sort} dir={dir} /></th>
            </tr>
          </thead>
          <tbody>
            {finalList.map((c) => (
              <tr key={c.id} className="row-link-host">
                <td>
                  <Link
                    href={`/admin/classes/${c.id}/edit`}
                    className="row-link-stretch"
                    style={{ fontWeight: 900, color: "var(--text)" }}
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="muted">{c.sport ?? "-"}</td>
                <td className="muted">{c.level ?? "-"}</td>
                <td className="muted">{c.schedule ?? "-"}</td>
                <td className="muted">{c.coach ?? "-"}</td>
                <td className="muted">{c.capacity ?? "-"}</td>
                <td>
                  <span className="badge gray">{countByClass.get(c.id) ?? 0}명</span>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[c.status] ?? "gray"}`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {finalList.length === 0 && (
              <tr>
                <td colSpan={8}>
                  <div className="empty-state">
                    {hasFilter ? (
                      <>
                        <strong>검색 결과가 없습니다</strong>
                        <p>필터·검색어를 조정해 보세요.</p>
                      </>
                    ) : (
                      <>
                        <strong>등록된 클래스가 없습니다</strong>
                        <p>
                          "클래스 생성"으로 첫 클래스를 만들면, 학생 등록 화면의
                          수강 클래스 드롭다운에 자동으로 나타납니다.
                        </p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
