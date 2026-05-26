import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { nextGrade, promoMeta, checkPromotionGate } from "@/lib/promotion";
import { bulkCreateGradePromotions } from "../actions";
import FilterBar from "../../FilterBar";
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";

const GRADE_OPTIONS = [
  "5세", "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
];

export default async function BulkNewPage({
  searchParams,
}: {
  searchParams: Promise<{ grade?: string; q?: string; year?: string }>;
}) {
  const { grade: gradeFilter, q, year } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 처리일 게이트 — 미설정 또는 처리일 이전이면 차단 화면
  const { data: center } = await supabase
    .from("centers")
    .select("promotion_day")
    .eq("id", cid)
    .maybeSingle();
  const gate = checkPromotionGate(
    (center as { promotion_day: string | null } | null)?.promotion_day,
  );
  if (gate.state !== "after") {
    return (
      <>
        <div className="page-head">
          <div>
            <h1>승급 대상 일괄 생성</h1>
            <p className="subtext">
              <Link href="/admin/grade-promotions" style={{ color: "var(--muted)" }}>
                ← 진학/학년 승급 관리
              </Link>
            </p>
          </div>
        </div>
        <div
          className="panel"
          style={{
            background: "var(--orange-soft)",
            borderColor: "#f0d19a",
            color: "var(--orange)",
            padding: "16px 18px",
          }}
        >
          {gate.state === "not-configured" ? (
            <>
              <strong>승급 처리일이 지정되지 않았습니다.</strong>
              <p style={{ marginTop: 6 }}>
                <Link href="/admin/settings">설정</Link> 에서 진학·승급 처리일을 먼저 입력해 주세요.
              </p>
            </>
          ) : (
            <>
              <strong>아직 처리일이 되지 않았습니다.</strong>
              <p style={{ marginTop: 6 }}>
                처리일: <b>{gate.targetDate}</b> · D-{gate.daysLeft}. 그 날 이후
                일괄 생성이 가능합니다.
              </p>
            </>
          )}
        </div>
      </>
    );
  }

  // 현재 연도 기준 +2년까지 학년도 옵션 생성 (default = 현재 학년도)
  const Y = new Date().getFullYear();
  const yearOptions = [`${Y}학년도`, `${Y + 1}학년도`, `${Y + 2}학년도`];
  const selectedYear = year ?? `${Y}학년도`;

  let studentQuery = supabase
    .from("students")
    .select("id, name, school, grade")
    .eq("center_id", cid)
    .order("name");
  if (gradeFilter) studentQuery = studentQuery.eq("grade", gradeFilter);
  if (q) studentQuery = studentQuery.or(`name.ilike.%${q}%,school.ilike.%${q}%`);

  // 같은 학년도에 이미 승급 건이 있는 학생 표시용
  const [studRes, promoRes] = await Promise.all([
    studentQuery,
    supabase
      .from("grade_promotions")
      .select("student_id, status")
      .eq("center_id", cid)
      .eq("school_year", selectedYear),
  ]);

  const list = studRes.data ?? [];
  const existingByStudent = new Map<string, string>();
  for (const p of promoRes.data ?? []) {
    const rec = p as { student_id: string; status: string };
    existingByStudent.set(rec.student_id, rec.status);
  }

  const hasFilter = !!(gradeFilter || q);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>승급 대상 일괄 생성</h1>
          <p className="subtext">
            <Link href="/admin/grade-promotions" style={{ color: "var(--muted)" }}>
              ← 진학/학년 승급 관리
            </Link>
          </p>
        </div>
      </div>

      <form action={bulkCreateGradePromotions}>
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              대상 학생 선택{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}명` : `${list.length}명`}
              </span>
            </p>
            <div className="toolbar">
              <select name="school_year" defaultValue={selectedYear}>
                {yearOptions.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
              <button className="btn primary" type="submit">선택 학생 일괄 생성</button>
            </div>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <FilterSelect
                param="grade"
                current={gradeFilter}
                placeholder="학년 전체"
                ariaLabel="학년 필터"
                options={GRADE_OPTIONS.map((g) => ({ value: g, label: g }))}
              />
              <FilterSelect
                param="year"
                current={year}
                placeholder={`${Y}학년도 (기본)`}
                ariaLabel="대상 학년도"
                options={yearOptions.map((y) => ({ value: y, label: y }))}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생·학교 검색" />
              {hasFilter && (
                <Link className="btn" href="/admin/grade-promotions/new">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th className="check-cell"></th>
                <th>학생</th>
                <th>현재 학교/학년</th>
                <th>승급 후(자동)</th>
                <th>유형</th>
                <th>{selectedYear} 기존</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const to = nextGrade(s.grade);
                const meta = promoMeta(to);
                const existing = existingByStudent.get(s.id);
                return (
                  <tr key={s.id}>
                    <td className="check-cell">
                      <input
                        type="checkbox"
                        name="student_ids"
                        value={s.id}
                        defaultChecked={!!to && !existing}
                        disabled={!to}
                      />
                    </td>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td className="muted">
                      {[s.school, s.grade].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td>
                      {to ? (
                        <strong>{to}</strong>
                      ) : (
                        <span className="muted">졸업/대상 아님</span>
                      )}
                    </td>
                    <td>
                      {to ? (
                        <span
                          className={`badge ${meta.needsParentInput ? "blue" : "gray"}`}
                        >
                          {meta.type}
                          {meta.needsParentInput ? " · 학교변경" : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>
                      {existing ? (
                        <span className="badge orange">
                          기존: {existing}
                        </span>
                      ) : (
                        <span className="muted">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>학생이 없습니다</strong>
                          <p>회원 관리에서 학생을 먼저 등록하세요.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          학교 변경 유형(초등 입학·초등→중등·중등→고등)은 "학부모 입력 요청"
          상태로 생성됩니다. 학부모 앱 단계 전까지는 상세에서 관리자가 새 학교를
          대행 입력할 수 있습니다. "{selectedYear} 기존" 컬럼에 표시된 학생은 같은
          학년도에 이미 승급 건이 있어 자동 체크 해제됩니다 — 필요하면 직접 체크해 추가
          생성 가능.
        </p>
      </form>
    </>
  );
}
