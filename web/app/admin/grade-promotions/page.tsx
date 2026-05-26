import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { checkPromotionGate } from "@/lib/promotion";
import {
  bulkSetStatus,
  setGradePromotionStatus,
  updatePromotionDetail,
  deleteGradePromotion,
} from "./actions";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";

type GP = {
  id: string;
  school_year: string | null;
  from_grade: string | null;
  to_grade: string | null;
  promo_type: string | null;
  status: string;
  note: string | null;
  to_school: string | null;
  needs_parent_input: boolean;
  processed_at: string | null;
  created_at: string | null;
  student_id: string;
  students: { name: string; school: string | null } | null;
};

const SB: Record<string, string> = {
  "진학 확인 필요": "orange",
  "학부모 입력 요청": "blue",
  "승인 완료": "green",
  보류: "gray",
};

const STATUS_OPTIONS = ["진학 확인 필요", "학부모 입력 요청", "승인 완료", "보류"];

export default async function GradePromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sel?: string; status?: string; year?: string; q?: string }>;
}) {
  const { sel, status, year, q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 필터 무관 카운트 + 학년도 옵션을 위해 전체 한 번 + 필터 적용 목록 한 번
  let listQuery = supabase
    .from("grade_promotions")
    .select(
      "id, school_year, from_grade, to_grade, promo_type, status, note, to_school, needs_parent_input, processed_at, created_at, student_id, students(name, school)",
    )
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);
  if (year) listQuery = listQuery.eq("school_year", year);

  const [listRes, allRes, centerRes] = await Promise.all([
    listQuery,
    supabase
      .from("grade_promotions")
      .select("status, school_year")
      .eq("center_id", cid),
    supabase
      .from("centers")
      .select("promotion_day")
      .eq("id", cid)
      .maybeSingle(),
  ]);
  const gate = checkPromotionGate(
    (centerRes.data as { promotion_day: string | null } | null)?.promotion_day,
  );

  let raw = (listRes.data ?? []) as unknown as GP[];

  // 학생명·학교 검색은 join 결과로 클라이언트(서버) 측 필터
  if (q) {
    const needle = q.toLowerCase();
    raw = raw.filter((g) => {
      const n = (g.students?.name ?? "").toLowerCase();
      const s = (g.students?.school ?? "").toLowerCase();
      return n.includes(needle) || s.includes(needle);
    });
  }

  const list = raw;
  const all = (allRes.data ?? []) as { status: string; school_year: string | null }[];
  const totals = {
    total: all.length,
    confirm: all.filter((g) => g.status === "진학 확인 필요").length,
    parentInput: all.filter((g) => g.status === "학부모 입력 요청").length,
    done: all.filter((g) => g.status === "승인 완료").length,
    hold: all.filter((g) => g.status === "보류").length,
  };
  const yearSet = new Set<string>();
  for (const g of all) if (g.school_year) yearSet.add(g.school_year);
  const yearOptions = [...yearSet].sort().reverse();

  const selected = sel ? list.find((g) => g.id === sel) ?? null : null;

  // sel 진입 링크가 다른 filter(status/year/q)를 보존하도록
  const selectHref = (id: string) => {
    const p = new URLSearchParams();
    p.set("sel", id);
    if (status) p.set("status", status);
    if (year) p.set("year", year);
    if (q) p.set("q", q);
    return `/admin/grade-promotions?${p.toString()}`;
  };
  const hasFilter = !!(status || year || q);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>진학/학년 승급 관리</h1>
          <p className="subtext">
            매년 처리일 이후 일괄 처리 · 승인 시 학생 학년(학교변경 시 학교)에 실제 반영
          </p>
          <p
            className="muted"
            style={{ fontSize: 12, marginTop: 4 }}
          >
            {gate.state === "not-configured" && (
              <>
                ⚠ <Link href="/admin/settings">설정</Link> 에서 진학·승급 처리일을 먼저 지정해 주세요.
              </>
            )}
            {gate.state === "before" && (
              <>
                처리일: <b>{gate.targetDate}</b> · D-{gate.daysLeft} (그 날 이후 일괄 생성 가능)
              </>
            )}
            {gate.state === "after" && (
              <>
                처리일: <b>{gate.targetDate}</b> · 일괄 생성 가능
              </>
            )}
          </p>
        </div>
        <div className="toolbar">
          {gate.state === "after" ? (
            <Link className="btn primary" href="/admin/grade-promotions/new">
              승급 대상 일괄 생성
            </Link>
          ) : (
            <button
              className="btn primary"
              type="button"
              disabled
              title={
                gate.state === "not-configured"
                  ? "설정에서 처리일을 먼저 지정하세요"
                  : `처리일까지 D-${gate.daysLeft}`
              }
            >
              승급 대상 일괄 생성
            </button>
          )}
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>승급 대상</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>진학 확인</span><strong>{totals.confirm}</strong></div>
        <div className="summary-card"><span>학부모 입력</span><strong>{totals.parentInput}</strong></div>
        <div className="summary-card"><span>승인 완료</span><strong>{totals.done}</strong></div>
        <div className="summary-card"><span>보류</span><strong>{totals.hold}</strong></div>
      </div>

      <div className="grid member-layout">
        <form action={bulkSetStatus} className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              승급 대상 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                  : `${list.length}건`}
              </span>
            </p>
            <div className="toolbar">
              <ConfirmButton
                message="선택한 승급 건을 승인 완료로 처리할까요?\n해당 학생들의 학년(학교변경 시 학교)이 실제 반영됩니다."
                className="btn primary"
                type="submit"
                name="status"
                value="승인 완료"
              >
                선택 승인 완료
              </ConfirmButton>
              <button className="btn warn" name="status" value="보류" type="submit">
                선택 보류
              </button>
            </div>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
              />
              {yearOptions.length > 0 && (
                <FilterSelect
                  param="year"
                  current={year}
                  placeholder="학년도 전체"
                  ariaLabel="학년도 필터"
                  options={yearOptions.map((y) => ({ value: y, label: y }))}
                />
              )}
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생·학교 검색" />
              {hasFilter && (
                <Link className="btn" href="/admin/grade-promotions">
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
                <th>학년도</th>
                <th>현재</th>
                <th>승급 후</th>
                <th>유형</th>
                <th>상태</th>
                <th>생성</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr
                  key={g.id}
                  className={`row-link-host ${g.id === sel ? "selected" : ""}`}
                >
                  <td className="check-cell">
                    <input type="checkbox" name="ids" value={g.id} />
                  </td>
                  <td>
                    <Link
                      href={selectHref(g.id)}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {g.students?.name ?? "-"}
                    </Link>
                    <div className="muted">{g.students?.school ?? ""}</div>
                  </td>
                  <td className="muted">{g.school_year ?? "-"}</td>
                  <td className="muted">{g.from_grade ?? "-"}</td>
                  <td className="muted">
                    {g.to_grade ?? "-"}
                    {g.needs_parent_input && (
                      <span className="badge blue" style={{ marginLeft: 6 }}>
                        학교변경
                      </span>
                    )}
                  </td>
                  <td className="muted">{g.promo_type ?? "-"}</td>
                  <td>
                    <span className={`badge ${SB[g.status] ?? "gray"}`}>
                      {g.status}
                    </span>
                  </td>
                  <td className="muted">
                    {g.created_at ? g.created_at.slice(0, 10) : "-"}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
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
                          <strong>승급 대상이 없습니다</strong>
                          <p>"승급 대상 일괄 생성"으로 대상을 만드세요.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </form>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">승급 상세/처리</p>
            {selected && (
              <span className={`badge ${SB[selected.status] ?? "gray"}`}>
                {selected.status}
              </span>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 승급 대상이 없습니다</strong>
                <p>왼쪽 목록에서 학생 이름을 클릭하세요.</p>
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">
                    {selected.students?.name}{" "}
                    {selected.needs_parent_input ? (
                      <span className="badge blue" style={{ marginLeft: 6 }}>
                        학교 변경
                      </span>
                    ) : (
                      <span className="badge gray" style={{ marginLeft: 6 }}>
                        일반 승급
                      </span>
                    )}
                    <Link
                      href={`/admin/students/${selected.student_id}`}
                      className="muted"
                      style={{ fontSize: 12, fontWeight: 400, marginLeft: 6 }}
                    >
                      학생 상세 →
                    </Link>
                  </p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>현재 학교/학년</span>
                      <strong>
                        {[selected.students?.school, selected.from_grade]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>유형</span>
                      <strong>{selected.promo_type ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>학년도</span>
                      <strong>{selected.school_year ?? "-"}</strong>
                    </div>
                    {selected.created_at && (
                      <div className="info-row">
                        <span>생성일</span>
                        <strong>{selected.created_at.slice(0, 10)}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <form
                  action={updatePromotionDetail.bind(null, selected.id)}
                  className="detail-block"
                >
                  <p className="detail-title">
                    승급 정보 {selected.needs_parent_input ? "(학교 변경 — 학부모 입력 대상)" : ""}
                  </p>
                  <div className="form-grid">
                    <div className="field">
                      <label>승급 후 학년</label>
                      <input
                        name="to_grade"
                        defaultValue={selected.to_grade ?? ""}
                      />
                    </div>
                    <div className="field">
                      <label>새 학교 {selected.needs_parent_input ? "*" : "(해당 시)"}</label>
                      <input
                        name="to_school"
                        defaultValue={selected.to_school ?? ""}
                        placeholder={
                          selected.needs_parent_input
                            ? "예: 송도중학교 (학부모 앱 생기면 학부모가 입력)"
                            : "학교 변경 없으면 비움"
                        }
                      />
                    </div>
                    <div className="field span-2">
                      <label>메모</label>
                      <textarea name="note" defaultValue={selected.note ?? ""} />
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button className="btn">저장 (관리자 대행 입력)</button>
                  </div>
                </form>

                <div className="detail-block">
                  <p className="detail-title">상태 처리</p>
                  <div className="action-grid">
                    {STATUS_OPTIONS.filter((st) => {
                      // "학부모 입력 요청" 은 학교 변경 케이스에만 의미 있음.
                      // 일반 승급(needs_parent_input=false) 에는 숨김. 단 이미 그 상태로 잘못 들어가 있는 경우는 표시해서 다른 상태로 빠져나갈 수 있게.
                      if (
                        st === "학부모 입력 요청" &&
                        !selected.needs_parent_input &&
                        selected.status !== "학부모 입력 요청"
                      ) {
                        return false;
                      }
                      return true;
                    }).map((st) => {
                      const isApprove = st === "승인 완료";
                      // 승인 완료 차단 조건: to_grade 비어있거나 / 학교변경인데 to_school 비어있음
                      const missingGrade = !selected.to_grade?.trim();
                      const missingSchool = selected.needs_parent_input && !selected.to_school?.trim();
                      const approveBlocked = isApprove && (missingGrade || missingSchool);
                      const blockedReason = missingGrade
                        ? "새 학년 입력 필요"
                        : missingSchool
                          ? "학교 변경 — 새 학교 입력 필요"
                          : "";
                      const btn = (
                        <button
                          className={`btn${st === "승인 완료" ? " primary" : st === "보류" ? " warn" : ""}`}
                          style={{ width: "100%" }}
                          disabled={selected.status === st || approveBlocked}
                          title={approveBlocked ? blockedReason : undefined}
                          type="submit"
                        >
                          {st}
                          {st === "승인 완료" ? " (반영)" : ""}
                        </button>
                      );
                      return (
                        <form
                          key={st}
                          action={setGradePromotionStatus.bind(null, selected.id, st)}
                        >
                          {isApprove && selected.status !== st && !approveBlocked ? (
                            <ConfirmButton
                              message={`'${selected.students?.name ?? "학생"}' 의 학년을 ${selected.to_grade ?? ""}${selected.to_school ? `, 학교를 ${selected.to_school}` : ""}로 반영합니다. 진행할까요?`}
                              className="btn primary"
                              style={{ width: "100%" }}
                              type="submit"
                            >
                              승인 완료 (반영)
                            </ConfirmButton>
                          ) : (
                            btn
                          )}
                        </form>
                      );
                    })}
                  </div>
                  {selected && !selected.to_grade?.trim() && (
                    <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      ⚠ 새 학년이 입력되지 않아 "승인 완료"를 진행할 수 없습니다.
                    </p>
                  )}
                  {selected?.needs_parent_input && !selected.to_school?.trim() && (
                    <p className="muted" style={{ fontSize: 11, marginTop: 6 }}>
                      ⚠ 학교 변경 건이므로 "새 학교" 입력이 필요합니다. (학부모 입력 대상)
                    </p>
                  )}
                  {!selected.needs_parent_input && selected.status !== "학부모 입력 요청" && (
                    <div className="muted" style={{ marginTop: 8, fontSize: 12 }}>
                      학년만 바뀌는 일반 승급이라 학부모 입력은 필요 없습니다. "승인 완료" 로 학년 반영하면 됩니다.
                    </div>
                  )}
                  <div style={{ marginTop: 10 }}>
                    <form
                      action={deleteGradePromotion.bind(null, selected.id)}
                    >
                      <ConfirmButton
                        message="이 진학 승급 건을 삭제할까요?"
                        className="btn danger"
                        style={{ width: "100%" }}
                        type="submit"
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  </div>
                  {selected.processed_at && (
                    <div className="muted" style={{ marginTop: 8 }}>
                      최근 처리: {selected.processed_at.slice(0, 10)}
                    </div>
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
