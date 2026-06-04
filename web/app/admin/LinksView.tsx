import Link from "next/link";
import { bulkSetLinkStatus } from "./links-actions";
import FilterBar from "./FilterBar";
import StatusChips from "./StatusChips";
import SearchInput from "./SearchInput";
import BulkSelectAll from "./BulkSelectAll";
import BulkSubmitButton from "./BulkSubmitButton";
import CheckRowToggle from "./CheckRowToggle";

const SB: Record<string, string> = {
  pending: "orange",
  linked: "green",
  rejected: "gray",
};
const LABEL: Record<string, string> = {
  pending: "승인 대기",
  linked: "연결 완료",
  rejected: "반려",
};

import type { ReactNode } from "react";

export type LinkRow = {
  id: string;
  status: string;
  studentId?: string | null;
  studentName: string | null;
  /** 학생 매칭 안 됨 (학부모 신청 정보) — 학생 이름 아래에 작게 표시 */
  studentNote?: string | null;
  /** 학생 이름 옆 inline 액션 (예: 매칭 모달 버튼) */
  studentAction?: ReactNode;
  whoName: string | null;
  whoSub: string | null;
  createdAt?: string | null;
};

export default function LinksView({
  title,
  subtitle,
  table,
  whoLabel,
  rows,
  q,
  status,
  resetHref,
  totals,
}: {
  title: string;
  subtitle: string;
  table: string;
  whoLabel: string;
  rows: LinkRow[];
  q?: string;
  status?: string;
  resetHref?: string;
  // 필터 무관 카운트 (요약 카드용). 미제공 시 rows 기준.
  totals?: {
    total: number;
    pending: number;
    linked: number;
    rejected: number;
  };
}) {
  const t = totals ?? {
    total: rows.length,
    pending: rows.filter((r) => r.status === "pending").length,
    linked: rows.filter((r) => r.status === "linked").length,
    rejected: rows.filter((r) => r.status === "rejected").length,
  };
  const hasFilter = !!(q || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="subtext">{subtitle}</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{t.total}</strong></div>
        <div className="summary-card"><span>승인 대기</span><strong>{t.pending}</strong></div>
        <div className="summary-card"><span>연결 완료</span><strong>{t.linked}</strong></div>
        <div className="summary-card"><span>반려</span><strong>{t.rejected}</strong></div>
        <div className="summary-card"><span>처리율</span><strong>
          {t.total ? Math.round(((t.linked + t.rejected) / t.total) * 100) : 0}%
        </strong></div>
      </div>

      <form action={bulkSetLinkStatus} className="panel elevated">
        <input type="hidden" name="table" value={table} />
        <div className="panel-head">
          <p className="panel-title">
            연결 요청 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${rows.length}건 / 전체 ${t.total}`
                : `${rows.length}건`}
            </span>
          </p>
          <div className="toolbar">
            <BulkSubmitButton
              name="status"
              value="linked"
              label="승인"
              emptyLabel="선택 승인"
              matchSelector='[data-status="pending"]'
              confirmMessage="선택한 요청을 승인할까요? 학부모/학생 앱에서 학생 정보가 노출됩니다."
            />
            <BulkSubmitButton
              name="status"
              value="rejected"
              label="반려"
              emptyLabel="선택 반려"
              variant="danger"
              matchSelector=':is([data-status="pending"], [data-status="linked"])'
              confirmMessage="선택한 요청을 반려할까요? 연결 완료 상태도 함께 해제됩니다."
            />
            <BulkSubmitButton
              name="status"
              value="pending"
              label="되돌리기"
              emptyLabel="대기로 되돌리기"
              variant="default"
              matchSelector=':is([data-status="linked"], [data-status="rejected"])'
              confirmMessage="선택한 요청을 다시 승인 대기 상태로 되돌릴까요?"
            />
          </div>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <StatusChips
              param="status"
              current={status}
              options={[
                { value: "pending", label: "대기" },
                { value: "linked", label: "완료" },
                { value: "rejected", label: "반려" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <SearchInput
              param="q"
              current={q}
              placeholder={`학생·${whoLabel} 검색`}
            />
            {hasFilter && resetHref && (
              <Link className="btn" href={resetHref}>
                초기화
              </Link>
            )}
          </FilterBar>
        </div>
        <CheckRowToggle>
        <table>
          <thead>
            <tr>
              <th className="check-cell">
                <BulkSelectAll />
              </th>
              <th>학생</th>
              <th>{whoLabel}</th>
              <th>요청일</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="check-cell">
                  <input
                    type="checkbox"
                    name="ids"
                    value={r.id}
                    data-status={r.status}
                  />
                </td>
                <td>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      {r.studentId && r.studentName ? (
                        <Link
                          href={`/admin/students?student=${r.studentId}`}
                          style={{ color: "var(--text)", fontWeight: 900 }}
                        >
                          {r.studentName}
                        </Link>
                      ) : (
                        <strong>{r.studentName ?? "-"}</strong>
                      )}
                      {r.studentNote && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {r.studentNote}
                        </div>
                      )}
                    </div>
                    {r.studentAction}
                  </div>
                </td>
                <td>
                  {r.whoName ?? "-"}
                  {r.whoSub && <div className="muted">{r.whoSub}</div>}
                </td>
                <td className="muted">
                  {r.createdAt ? r.createdAt.slice(0, 10) : "-"}
                </td>
                <td>
                  <span className={`badge ${SB[r.status] ?? "gray"}`}>
                    {LABEL[r.status] ?? r.status}
                  </span>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
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
                        <strong>연결 요청이 없습니다</strong>
                        <p>
                          {whoLabel} 본인이 앱/포털에서 가입 후 연결을 요청하면 여기
                          표시됩니다. (포털 단계에서 유입 연결)
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
    </>
  );
}
