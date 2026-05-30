import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";
import SortHeader from "../SortHeader";
import AssignEnrollmentModal from "../enrollments/AssignEnrollmentModal";

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

  const [listRes, allRes, studRes, selectedRes, selectedStudentsRes, allStudentsRes, productsRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("status").eq("center_id", cid),
    supabase
      .from("students")
      .select("class_id")
      .eq("center_id", cid)
      .eq("status", "정상"),
    selectedId
      ? supabase
          .from("classes")
          .select("id, name, sport, level, capacity, coach, schedule, status, days_of_week, start_time, end_time, place")
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    selectedId
      ? supabase
          .from("students")
          .select("id, name, attendance_days, status")
          .eq("center_id", cid)
          .eq("class_id", selectedId)
          .eq("status", "정상")
          .order("name")
      : Promise.resolve({ data: [] }),
    selectedId
      ? supabase
          .from("students")
          .select("id, name")
          .eq("center_id", cid)
          .eq("status", "정상")
          .order("name")
      : Promise.resolve({ data: [] }),
    selectedId
      ? supabase
          .from("products")
          .select("id, name, sessions_per_week, price")
          .eq("center_id", cid)
          .eq("active", true)
          .order("sessions_per_week", { ascending: true, nullsFirst: false })
      : Promise.resolve({ data: [] }),
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

  const selected = selectedRes.data;
  const selectedStudents = (selectedStudentsRes.data ?? []) as {
    id: string;
    name: string;
    attendance_days: string | null;
    status: string | null;
  }[];
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
    <>
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
                    <Link
                      href={`/admin/classes?class=${c.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {c.name}
                    </Link>
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

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">클래스 상세</p>
            {selected && (
              <div className="toolbar">
                <Link className="btn primary" href={`/admin/classes/${selected.id}/edit`}>수정</Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 클래스가 없습니다</strong>
                <p>왼쪽 목록에서 클래스를 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>{selected.status}</span>{" "}
                      <span className="badge gray">{countByClass.get(selected.id) ?? 0}명 수강</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">기본 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>종목</span><strong>{selected.sport ?? "-"}</strong></div>
                    <div className="info-row"><span>레벨</span><strong>{selected.level ?? "-"}</strong></div>
                    <div className="info-row"><span>코치</span><strong>{selected.coach ?? "-"}</strong></div>
                    <div className="info-row"><span>정원</span><strong>{selected.capacity != null ? `${selected.capacity}명` : "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">일정</p>
                  <div className="info-list">
                    <div className="info-row"><span>요일</span><strong>{selected.days_of_week ?? "-"}</strong></div>
                    <div className="info-row">
                      <span>시간</span>
                      <strong>
                        {selected.start_time
                          ? `${selected.start_time.slice(0, 5)}${selected.end_time ? `~${selected.end_time.slice(0, 5)}` : ""}`
                          : "-"}
                      </strong>
                    </div>
                    <div className="info-row"><span>장소</span><strong>{selected.place ?? "-"}</strong></div>
                    <div className="info-row"><span>일정 메모</span><strong>{selected.schedule ?? "-"}</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <p className="detail-title" style={{ margin: 0 }}>
                      수강 학생{" "}
                      <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                        {selectedStudents.length}명
                      </span>
                    </p>
                    <AssignEnrollmentModal
                      triggerLabel="+ 학생 추가"
                      triggerClassName="btn primary"
                      classes={[
                        {
                          id: selected.id,
                          name: selected.name,
                          days_of_week: selected.days_of_week,
                        },
                      ]}
                      products={allProducts}
                      students={allStudents}
                      fixedClassId={selected.id}
                      backUrl={`/admin/classes?class=${selected.id}`}
                    />
                  </div>
                  {selectedStudents.length === 0 ? (
                    <div className="muted" style={{ fontSize: 13 }}>
                      이 클래스에 배정된 정상 회원이 없습니다 (휴원·탈퇴 제외).
                    </div>
                  ) : (
                    <table>
                      <thead>
                        <tr>
                          <th>학생</th>
                          <th>참여 요일</th>
                          <th>회/주</th>
                          <th>상태</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedStudents.map((s) => {
                          const days = (s.attendance_days ?? "")
                            .split(",")
                            .map((d) => d.trim())
                            .filter(Boolean);
                          return (
                            <tr key={s.id}>
                              <td>
                                <Link
                                  href={`/admin/students/${s.id}`}
                                  style={{ fontWeight: 700, color: "var(--text)" }}
                                >
                                  {s.name}
                                </Link>
                              </td>
                              <td className="muted">
                                {days.length === 0 ? (
                                  <span className="muted">미지정</span>
                                ) : (
                                  days.join(", ")
                                )}
                              </td>
                              <td>
                                {days.length > 0 && (
                                  <span className="badge gray">{days.length}회</span>
                                )}
                              </td>
                              <td className="muted">{s.status ?? "-"}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
