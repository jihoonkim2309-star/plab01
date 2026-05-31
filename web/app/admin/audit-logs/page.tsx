import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; target?: string }>;
}) {
  const { q, target } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("audit_logs")
    .select("id, action, target_table, target_id, created_at, users(name)")
    .eq("center_id", cid)
    .order("created_at", { ascending: false })
    .limit(300);
  if (target) listQuery = listQuery.eq("target_table", target);
  if (q) listQuery = listQuery.ilike("action", `%${q}%`);

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase
      .from("audit_logs")
      .select("target_table, created_at")
      .eq("center_id", cid)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const list = (listRes.data ?? []) as unknown as {
    id: string;
    action: string;
    target_table: string | null;
    target_id: string | null;
    created_at: string;
    users: { name: string | null } | null;
  }[];
  const all = (allRes.data ?? []) as {
    target_table: string | null;
    created_at: string;
  }[];

  const today = new Date().toISOString().slice(0, 10);
  const todayCount = all.filter((a) => a.created_at?.startsWith(today)).length;
  const tables = Array.from(
    new Set(all.map((a) => a.target_table).filter(Boolean) as string[]),
  );
  const hasFilter = !!(q || target);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>감사 로그</h1>
          <p className="subtext">관리자 주요 작업 기록 (최근 300건)</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>최근 300건</span><strong>{all.length}</strong></div>
        <div className="summary-card"><span>오늘</span><strong>{todayCount}</strong></div>
        <div className="summary-card"><span>대상 테이블 수</span><strong>{tables.length}</strong></div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">
            활동 내역{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${list.length}건 / 전체 ${all.length}`
                : `${list.length}건`}
            </span>
          </p>
        </div>

        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            {tables.length > 0 && (
              <FilterSelect
                param="target"
                current={target}
                placeholder="대상 테이블 전체"
                ariaLabel="대상 테이블 필터"
                options={tables.map((t) => ({ value: t, label: t }))}
              />
            )}
            <div style={{ flex: 1 }} />
            <SearchInput param="q" current={q} placeholder="작업명 검색" />
            {hasFilter && (
              <Link className="btn" href="/admin/audit-logs">
                초기화
              </Link>
            )}
          </FilterBar>
        </div>

        <div className="list-scroll">
        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>작업자</th>
              <th>작업</th>
              <th>대상</th>
            </tr>
          </thead>
          <tbody>
            {list.map((a) => (
              <tr key={a.id}>
                <td className="muted">
                  {a.created_at?.slice(0, 16).replace("T", " ")}
                </td>
                <td className="muted">{a.users?.name ?? "-"}</td>
                <td>
                  <strong>{a.action}</strong>
                </td>
                <td className="muted">
                  {a.target_table ?? "-"}
                  {a.target_id ? ` · ${a.target_id.slice(0, 8)}` : ""}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={4}>
                  <div className="empty-state">
                    {hasFilter ? (
                      <>
                        <strong>검색 결과가 없습니다</strong>
                        <p>필터·검색어를 조정해 보세요.</p>
                      </>
                    ) : (
                      <>
                        <strong>감사 로그가 없습니다</strong>
                        <p>주요 작업 기록 구조가 준비되어 있습니다.</p>
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
