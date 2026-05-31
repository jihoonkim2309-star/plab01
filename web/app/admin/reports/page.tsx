import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { ensureReportsForMonth } from "@/lib/reports";
import MonthNav from "../MonthNav";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import BulkSelectAll from "../BulkSelectAll";
import BulkSubmitButton from "../BulkSubmitButton";
import CheckRowToggle from "../CheckRowToggle";
import { ReportDrawerProvider } from "./ReportDrawerContext";
import ReportDetailDrawer from "./ReportDetailDrawer";
import ReportRowLink from "./ReportRowLink";
import { bulkReportAction } from "./actions";

const pad = (n: number) => String(n).padStart(2, "0");
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

// 발행 유무 라벨 — status 값을 사용자 친화 표현으로.
const STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  생성대기: { text: "미발행", cls: "gray" },
  생성완료: { text: "미발행", cls: "blue" },
  발행완료: { text: "발행됨", cls: "green" },
};

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ym?: string;
    rid?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const { ym, rid, q, status } = await searchParams;
  const target = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : thisMonth();
  const { supabase, centerId: cid } = await requireCenter();

  // 멱등 리포트 보장 — 청구 관리의 ensureInvoicesForMonth 패턴.
  // 승인된 측정이 있는데 리포트 없으면 자동 생성, 발행 전 리포트는 snapshot 최신화.
  const autoCreated = await ensureReportsForMonth(target);

  const [listRes, approvedRes, detailRes] = await Promise.all([
    supabase
      .from("reports")
      .select(
        "id, student_id, report_month, report_type, status, coach_comment, admin_comment, published_at, parent_viewed_at, parent_view_count, students(name)",
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
    coach_comment: string | null;
    admin_comment: string | null;
    published_at: string | null;
    parent_viewed_at: string | null;
    parent_view_count: number | null;
    students: { name: string } | null;
  }[];

  // 필터 무관 totals
  const cnt = (s: string) => allList.filter((r) => r.status === s).length;
  const approvedCount = approvedRes.count ?? 0;

  // 필터 적용 리스트 (학생명 검색·상태)
  const needle = q?.toLowerCase() ?? "";
  const list = allList.filter((r) => {
    if (status && r.status !== status) return false;
    if (needle && !(r.students?.name ?? "").toLowerCase().includes(needle))
      return false;
    return true;
  });
  const hasFilter = !!(q || status);

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
    }
    return `/admin/reports${qs.toString() ? `?${qs}` : ""}`;
  };

  return (
    <ReportDrawerProvider>
      <div className="page-head">
        <div>
          <h1>리포트 관리</h1>
          <p className="subtext">승인된 측정 기반 자동 생성 → 코멘트 → 발행 (학부모 공개)</p>
        </div>
        <div className="toolbar">
          <MonthNav ym={target} baseUrl="/admin/reports" />
        </div>
      </div>

      {autoCreated > 0 && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          승인된 측정 {autoCreated}건이 자동으로 리포트로 생성되었습니다.
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 리포트</span>
          <strong>{allList.length}</strong>
        </div>
        <div className="summary-card">
          <span>미발행</span>
          <strong>{cnt("생성완료")}</strong>
        </div>
        <div className="summary-card">
          <span>발행됨</span>
          <strong>{cnt("발행완료")}</strong>
        </div>
        <div className="summary-card">
          <span>학부모 열람</span>
          <strong>
            {allList.filter((r) => r.parent_viewed_at).length}
          </strong>
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
                  { value: "생성완료", label: "미발행" },
                  { value: "발행완료", label: "발행됨" },
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
          <form action={bulkReportAction}>
          <div
            className="toolbar"
            style={{ padding: "8px 16px", justifyContent: "flex-end" }}
          >
            <BulkSubmitButton
              name="action"
              value="publish"
              confirmMessage="선택한 리포트를 발행할까요? 학부모 앱에 노출되며 측정값 snapshot 이 동결됩니다."
            >
              {(n) => `선택 ${n}건 일괄 발행`}
            </BulkSubmitButton>
          </div>
          <CheckRowToggle>
          <table>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <BulkSelectAll />
                </th>
                <th>학생</th>
                <th>발행</th>
                <th>코멘트</th>
                <th>열람</th>
              </tr>
            </thead>
            <tbody>
              {list.map((r) => {
                const hasCoach = !!(r.coach_comment && r.coach_comment.trim());
                const hasAdmin = !!(r.admin_comment && r.admin_comment.trim());
                const label = STATUS_LABEL[r.status] ?? {
                  text: r.status,
                  cls: "gray",
                };
                const isPublished = r.status === "발행완료";
                return (
                  <tr key={r.id} className="row-link-host">
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        name="ids"
                        value={r.id}
                        disabled={isPublished}
                        aria-label="리포트 선택"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    <td>
                      <ReportRowLink
                        reportId={r.id}
                        href={navUrl({
                          ym: target,
                          rid: r.id,
                          keepFilter: true,
                        })}
                        className="row-link-stretch"
                        style={{ color: "inherit" }}
                      >
                        <strong>{r.students?.name ?? "-"}</strong>
                      </ReportRowLink>
                    </td>
                    <td>
                      <span className={`badge ${label.cls}`}>{label.text}</span>
                    </td>
                    <td>
                      {hasCoach || hasAdmin ? (
                        <span style={{ display: "inline-flex", gap: 6 }}>
                          {hasCoach && (
                            <span
                              className="badge blue"
                              title="코치 코멘트 있음"
                            >
                              코치
                            </span>
                          )}
                          {hasAdmin && (
                            <span
                              className="badge green"
                              title="관리자 코멘트 있음"
                            >
                              관리자
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="muted" style={{ fontSize: 12 }}>
                          -
                        </span>
                      )}
                    </td>
                    <td>
                      {r.parent_viewed_at ? (
                        <span
                          className="badge green"
                          title={`최초 ${r.parent_viewed_at.slice(0, 10).replace(/-/g, ".")} · 누적 ${r.parent_view_count ?? 0}회`}
                        >
                          열람 {r.parent_view_count ?? 0}
                        </span>
                      ) : (
                        <span className="badge gray">미열람</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
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
                          <strong>리포트가 없습니다</strong>
                          <p>
                            <Link href={`/admin/measurements?ym=${target}`}>
                              측정 데이터 관리
                            </Link>
                            에서 학생 측정값을 입력·승인하면 여기에 리포트가
                            자동 생성됩니다.
                          </p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          </CheckRowToggle>
          </form>
        </div>

        {/* 우: 디테일 (client drawer) */}
        <ReportDetailDrawer period={target} />
      </div>
    </ReportDrawerProvider>
  );
}
