import Link from "next/link";
import FilterBar from "./FilterBar";
import SearchInput from "./SearchInput";

export type AccountRow = {
  id: string;
  name: string | null;
  email: string | null;
  phone?: string | null;
  createdAt: string | null;
  extra?: string | null;
};

export default function AccountsView({
  title,
  subtitle,
  extraLabel,
  rows,
  q,
  showPhone = false,
  resetHref,
  totals,
}: {
  title: string;
  subtitle: string;
  extraLabel?: string;
  rows: AccountRow[];
  q?: string;
  showPhone?: boolean;
  // 필터 초기화 링크 — 페이지마다 베이스 경로가 달라 페이지에서 지정
  resetHref?: string;
  // 필터 무관 전체 카운트 (검색 적용 전 기준) — 미제공 시 rows.length 사용
  totals?: { total: number; extraCounts?: { label: string; value: number | string }[] };
}) {
  const hasFilter = !!q;
  const colCount = 2 + (showPhone ? 1 : 0) + (extraLabel ? 1 : 0) + 1;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="subtext">{subtitle}</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 계정</span>
          <strong>{totals?.total ?? rows.length}</strong>
        </div>
        {totals?.extraCounts?.map((c) => (
          <div className="summary-card" key={c.label}>
            <span>{c.label}</span>
            <strong>{c.value}</strong>
          </div>
        ))}
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">
            계정 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter && totals
                ? `검색결과 ${rows.length}건 / 전체 ${totals.total}`
                : `${rows.length}건`}
            </span>
          </p>
        </div>
        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <div style={{ flex: 1 }} />
            <SearchInput
              param="q"
              current={q}
              placeholder={
                showPhone ? "이름·이메일·전화 검색" : "이름·이메일 검색"
              }
            />
            {hasFilter && resetHref && (
              <Link className="btn" href={resetHref}>
                초기화
              </Link>
            )}
          </FilterBar>
        </div>
        <div className="list-scroll">
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              {showPhone && <th>전화</th>}
              {extraLabel && <th>{extraLabel}</th>}
              <th>가입일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>
                  <strong>{r.name ?? "-"}</strong>
                </td>
                <td className="muted">{r.email ?? "-"}</td>
                {showPhone && <td className="muted">{r.phone ?? "-"}</td>}
                {extraLabel && <td className="muted">{r.extra ?? "-"}</td>}
                <td className="muted">{r.createdAt?.slice(0, 10) ?? "-"}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={colCount}>
                  <div className="empty-state">
                    {hasFilter ? (
                      <>
                        <strong>검색 결과가 없습니다</strong>
                        <p>다른 검색어로 시도해 보세요.</p>
                      </>
                    ) : (
                      <>
                        <strong>계정이 없습니다</strong>
                        <p>
                          해당 역할 사용자가 포털/앱에서 가입하면 여기 표시됩니다.
                          (포털 단계에서 유입)
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
      </div>
    </>
  );
}
