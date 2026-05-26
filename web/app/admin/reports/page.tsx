import Link from "next/link";
import { requireCenter } from "@/lib/center";
import MonthNav from "../MonthNav";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import {
  deleteReport,
  generateReportsForMonth,
  publishReport,
  unpublishReport,
  updateReport,
} from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const STATUS_BADGE: Record<string, string> = {
  생성대기: "gray",
  생성완료: "blue",
  발행완료: "green",
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ym?: string;
    rid?: string;
    q?: string;
    status?: string;
    publicTo?: string;
  }>;
}) {
  const { ym, rid, q, status, publicTo } = await searchParams;
  const target = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : thisMonth();
  const { supabase, centerId: cid } = await requireCenter();

  const [listRes, approvedRes, detailRes] = await Promise.all([
    supabase
      .from("reports")
      .select(
        "id, student_id, report_month, report_type, status, public_to_parent, published_at, students(name)",
      )
      .eq("center_id", cid)
      .eq("report_month", target)
      .order("created_at", { ascending: false }),
    supabase
      .from("measurements")
      .select("id", { count: "exact", head: true })
      .eq("center_id", cid)
      .eq("measurement_month", target)
      .eq("status", "승인완료"),
    rid
      ? supabase
          .from("reports")
          .select(
            "id, snapshot, coach_comment, admin_comment, public_to_parent, published_at",
          )
          .eq("center_id", cid)
          .eq("report_month", target)
          .eq("id", rid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  const allList = (listRes.data ?? []) as unknown as {
    id: string;
    student_id: string;
    report_month: string;
    report_type: string;
    status: string;
    public_to_parent: boolean;
    published_at: string | null;
    students: { name: string } | null;
  }[];

  // 필터 무관 totals
  const cnt = (s: string) => allList.filter((r) => r.status === s).length;
  const approvedCount = approvedRes.count ?? 0;

  // 필터 적용 리스트 (학생명 검색·상태·공개여부)
  const needle = q?.toLowerCase() ?? "";
  const list = allList.filter((r) => {
    if (status && r.status !== status) return false;
    if (publicTo === "public" && !r.public_to_parent) return false;
    if (publicTo === "private" && r.public_to_parent) return false;
    if (needle && !(r.students?.name ?? "").toLowerCase().includes(needle))
      return false;
    return true;
  });
  const hasFilter = !!(q || status || publicTo);

  // 선택된 리포트는 필터에 가려져도 detail 은 표시
  const selected = rid ? allList.find((r) => r.id === rid) ?? null : null;
  const rDetail = detailRes.data;

  const navUrl = (p: {
    ym?: string;
    rid?: string | null;
    keepFilter?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (p.ym) qs.set("ym", p.ym);
    if (p.rid) qs.set("rid", p.rid);
    if (p.keepFilter) {
      if (q) qs.set("q", q);
      if (status) qs.set("status", status);
      if (publicTo) qs.set("publicTo", publicTo);
    }
    return `/admin/reports${qs.toString() ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>리포트 관리</h1>
          <p className="subtext">
            {target} · 승인 완료 측정 {approvedCount}건 → 학생당 월간 통합 리포트
            1개 생성/갱신
          </p>
        </div>
        <div className="toolbar">
          <MonthNav ym={target} baseUrl="/admin/reports" />
          <form action={generateReportsForMonth}>
            <input type="hidden" name="ym" value={target} />
            <button
              className="btn primary"
              type="submit"
              disabled={approvedCount === 0}
              title={
                approvedCount === 0
                  ? "이 달엔 승인 완료된 측정이 없습니다. '측정 데이터 관리'에서 먼저 채우세요."
                  : ""
              }
            >
              일괄 생성/누락 보충
            </button>
          </form>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 리포트</span>
          <strong>{allList.length}</strong>
        </div>
        <div className="summary-card">
          <span>생성완료</span>
          <strong>{cnt("생성완료")}</strong>
        </div>
        <div className="summary-card">
          <span>발행완료</span>
          <strong>{cnt("발행완료")}</strong>
        </div>
        <div className="summary-card">
          <span>학부모 공개</span>
          <strong>{allList.filter((r) => r.public_to_parent).length}</strong>
        </div>
        <div className="summary-card">
          <span>승인된 측정</span>
          <strong>{approvedCount}</strong>
        </div>
      </div>

      <div className="grid account-layout">
        {/* 좌: 리포트 목록 */}
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              리포트 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${allList.length}`
                  : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "생성완료", label: "생성완료" },
                  { value: "발행완료", label: "발행완료" },
                ]}
              />
              <StatusChips
                param="publicTo"
                current={publicTo}
                allLabel="공개무관"
                options={[
                  { value: "public", label: "공개" },
                  { value: "private", label: "비공개" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생명 검색" />
              {hasFilter && (
                <Link
                  className="btn"
                  href={navUrl({ ym: target, rid: rid ?? null })}
                >
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th>학생</th>
                <th>상태</th>
                <th>공개</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr
                  key={r.id}
                  className={`row-link-host ${selected?.id === r.id ? "selected" : ""}`}
                >
                  <td>
                    <Link
                      href={navUrl({
                        ym: target,
                        rid: r.id,
                        keepFilter: true,
                      })}
                      className="row-link-stretch"
                      style={{ color: "inherit" }}
                    >
                      <strong>{r.students?.name ?? "-"}</strong>
                    </Link>
                  </td>
                  <td>
                    <span
                      className={`badge ${STATUS_BADGE[r.status] ?? "gray"}`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td>
                    {r.public_to_parent ? (
                      <span className="badge green">공개</span>
                    ) : (
                      <span className="badge gray">비공개</span>
                    )}
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>리포트가 없습니다</strong>
                          <p>
                            승인 완료된 측정이 있으면 위의{" "}
                            <b>일괄 생성/누락 보충</b> 버튼으로 한 번에 생성할
                            수 있습니다.
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

        {/* 우: 디테일 */}
        <div className="panel elevated">
          {!selected || !rDetail ? (
            <>
              <div className="panel-head">
                <p className="panel-title">리포트 상세</p>
              </div>
              <div className="panel-body">
                <div className="empty-state">
                  <strong>리포트를 선택하세요</strong>
                  <p>좌측에서 리포트를 선택하면 코멘트·미리보기·발행을 처리할 수 있습니다.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="panel-head">
                <p className="panel-title">
                  <Link
                    href={`/admin/students?student=${selected.student_id}`}
                    style={{ color: "var(--text)" }}
                  >
                    {selected.students?.name ?? "-"}
                  </Link>{" "}
                  · {selected.report_type} · {selected.report_month}
                </p>
                <span
                  className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}
                >
                  {selected.status}
                </span>
              </div>
              <div className="panel-body">
                {/* 미리보기 — 발행 전엔 최신 측정값으로 항상 라이브 빌드됨 */}
                <div
                  className="toolbar"
                  style={{ justifyContent: "flex-start", marginBottom: 12 }}
                >
                  <Link
                    className="btn"
                    href={`/admin/reports/${selected.id}/preview`}
                    target="_blank"
                  >
                    PDF 미리보기 (새 창)
                  </Link>
                  <span
                    className="muted"
                    style={{ fontSize: 12, alignSelf: "center" }}
                  >
                    발행 전엔 최신 측정값이 자동 반영됩니다. 발행 시점에 동결.
                  </span>
                </div>

                {/* 코멘트/공개 */}
                <form action={updateReport} className="form-grid">
                  <input type="hidden" name="id" value={selected.id} />
                  <div className="field span-2">
                    <label>코치 코멘트</label>
                    <textarea
                      name="coach_comment"
                      defaultValue={rDetail.coach_comment ?? ""}
                      rows={3}
                    />
                  </div>
                  <div className="field span-2">
                    <label>관리자 코멘트</label>
                    <textarea
                      name="admin_comment"
                      defaultValue={rDetail.admin_comment ?? ""}
                      rows={3}
                    />
                  </div>
                  <div className="field span-2">
                    <label>학부모 공개</label>
                    <label
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <input
                        name="public_to_parent"
                        type="checkbox"
                        defaultChecked={rDetail.public_to_parent}
                      />
                      <span className="muted">
                        체크 시 학부모 앱·링크에 노출 (발행 시 자동 체크됨)
                      </span>
                    </label>
                  </div>
                  <div
                    className="span-2 toolbar"
                    style={{ justifyContent: "flex-start" }}
                  >
                    <button className="btn primary" type="submit">
                      코멘트 저장
                    </button>
                  </div>
                </form>

                {/* 발행 액션 */}
                <div
                  className="toolbar"
                  style={{ justifyContent: "flex-start", marginTop: 12 }}
                >
                  {selected.status !== "발행완료" ? (
                    <form action={publishReport}>
                      <input type="hidden" name="id" value={selected.id} />
                      <button className="btn primary" type="submit">
                        발행
                      </button>
                    </form>
                  ) : (
                    <form action={unpublishReport}>
                      <input type="hidden" name="id" value={selected.id} />
                      <button className="btn" type="submit">
                        발행 취소
                      </button>
                    </form>
                  )}
                  <form action={deleteReport}>
                    <input type="hidden" name="id" value={selected.id} />
                    <input type="hidden" name="ym" value={target} />
                    <ConfirmButton
                      message={`'${selected.students?.name ?? "학생"}'의 ${selected.report_month} 리포트를 삭제할까요?`}
                      className="btn danger"
                      type="submit"
                    >
                      삭제
                    </ConfirmButton>
                  </form>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
