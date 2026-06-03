import { requireSuperAdmin } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import { NoticeDrawerProvider } from "./NoticeDrawerContext";
import NoticeRowLink from "./NoticeRowLink";
import NoticeDetailPanel from "./NoticeDetailPanel";
import NewNoticeButton from "./NewNoticeButton";

const SCOPE_LABEL: Record<string, string> = {
  all: "전체 지점",
  centers: "특정 지점",
};

export default async function HqNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    q?: string;
    published?: string;
  }>;
}) {
  const { status, q, published } = await searchParams;
  const { supabase } = await requireSuperAdmin();

  const [listRes, centersRes] = await Promise.all([
    supabase
      .from("hq_notices")
      .select("id, title, scope, target_center_ids, published_at, notified_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    supabase.from("centers").select("id, name").order("name"),
  ]);

  type Row = {
    id: string;
    title: string;
    scope: string;
    target_center_ids: string[] | null;
    published_at: string | null;
    notified_count: number;
    created_at: string;
  };
  const allList = (listRes.data ?? []) as unknown as Row[];

  const needle = q?.toLowerCase() ?? "";
  const list = allList.filter((a) => {
    const isPub = !!a.published_at;
    if (status === "draft" && isPub) return false;
    if (status === "published" && !isPub) return false;
    if (needle && !a.title.toLowerCase().includes(needle)) return false;
    return true;
  });
  const totals = {
    total: allList.length,
    draft: allList.filter((a) => !a.published_at).length,
    pub: allList.filter((a) => !!a.published_at).length,
  };
  const centers = (centersRes.data ?? []) as { id: string; name: string }[];

  return (
    <NoticeDrawerProvider>
      <div className="page-head">
        <div>
          <h1>본사 공지 발송</h1>
          <p className="subtext">지점 어드민에게 보내는 본사 공지 작성·발행</p>
        </div>
        <div className="toolbar">
          <NewNoticeButton />
        </div>
      </div>

      {published && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          본사 공지가 발행되었습니다. 대상 지점 어드민이 [본사 공지] 메뉴에서 열람합니다.
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>작성 중 (draft)</span><strong>{totals.draft}</strong></div>
        <div className="summary-card"><span>발행 완료</span><strong>{totals.pub}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">목록</p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "draft", label: "작성 중" },
                  { value: "published", label: "발행 완료" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="제목 검색" />
            </FilterBar>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>제목</th>
                  <th>대상</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr key={a.id} className="row-link-host">
                    <td>
                      <NoticeRowLink
                        noticeId={a.id}
                        href={`/admin/hq-notices?id=${a.id}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 700, color: "var(--text)" }}
                      >
                        {a.title}
                      </NoticeRowLink>
                    </td>
                    <td className="muted">
                      {SCOPE_LABEL[a.scope] ?? a.scope}
                      {a.scope === "centers" && a.target_center_ids
                        ? ` (${a.target_center_ids.length})`
                        : ""}
                    </td>
                    <td>
                      {a.published_at ? (
                        <span className="badge green">발행 {a.notified_count} 지점</span>
                      ) : (
                        <span className="badge gray">작성 중</span>
                      )}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">
                        <strong>본사 공지가 없습니다</strong>
                        <p>우측 상단 [새 본사 공지] 로 시작하세요.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <NoticeDetailPanel initialCenters={centers} />
      </div>
    </NoticeDrawerProvider>
  );
}
