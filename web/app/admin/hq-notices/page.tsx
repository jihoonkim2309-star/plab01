import Link from "next/link";
import { requireSuperAdmin } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ConfirmButton from "../ConfirmButton";
import HqNoticeForm from "./HqNoticeForm";
import { publishHqNotice, deleteHqNotice } from "./actions";

const SCOPE_LABEL: Record<string, string> = {
  all: "전체 지점",
  centers: "특정 지점",
};

export default async function HqNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    status?: string;
    q?: string;
    published?: string;
  }>;
}) {
  const { id, status, q, published } = await searchParams;
  const { supabase } = await requireSuperAdmin();

  const [listRes, selectedRes, centersRes, readsRes] = await Promise.all([
    supabase
      .from("hq_notices")
      .select("id, title, scope, target_center_ids, published_at, notified_count, created_at")
      .order("created_at", { ascending: false })
      .limit(200),
    id
      ? supabase
          .from("hq_notices")
          .select(
            "id, title, body, scope, target_center_ids, published_at, notified_count, created_at",
          )
          .eq("id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("centers").select("id, name").order("name"),
    id
      ? supabase
          .from("hq_notice_reads")
          .select("center_id, user_id, read_at")
          .eq("notice_id", id)
          .order("read_at", { ascending: true })
      : Promise.resolve({ data: [] }),
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

  const selected = selectedRes.data as (Row & { body: string }) | null;
  const centers = (centersRes.data ?? []) as { id: string; name: string }[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>본사 공지 발송</h1>
          <p className="subtext">지점 어드민에게 보내는 본사 공지 작성·발행</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/hq-notices?id=new">
            새 본사 공지
          </Link>
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
                  <tr
                    key={a.id}
                    className={`row-link-host ${a.id === id ? "selected" : ""}`}
                  >
                    <td>
                      <Link
                        href={`/admin/hq-notices?id=${a.id}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 700, color: "var(--text)" }}
                      >
                        {a.title}
                      </Link>
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

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              {id === "new" ? "새 본사 공지" : selected ? selected.title : "공지 상세"}
            </p>
          </div>
          <div className="panel-body">
            {id === "new" ? (
              <HqNoticeForm centers={centers} />
            ) : selected ? (
              selected.published_at ? (
                <>
                  <div className="detail-block" style={{ marginTop: 0 }}>
                    <p className="detail-title">발행 정보</p>
                    <div className="info-list">
                      <div className="info-row">
                        <span>발행일시</span>
                        <strong>{selected.published_at.slice(0, 16).replace("T", " ")}</strong>
                      </div>
                      <div className="info-row">
                        <span>대상</span>
                        <strong>{SCOPE_LABEL[selected.scope]}</strong>
                      </div>
                      <div className="info-row">
                        <span>대상 지점 수</span>
                        <strong>{selected.notified_count}</strong>
                      </div>
                    </div>
                  </div>
                  <div className="detail-block">
                    <p className="detail-title">본문</p>
                    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selected.body}</p>
                  </div>
                  {(() => {
                    const reads = (readsRes.data ?? []) as {
                      center_id: string;
                      user_id: string;
                      read_at: string;
                    }[];
                    // 대상 지점 — scope='all' 이면 모든 센터, 'centers' 면 target_center_ids
                    const targetIds =
                      selected.scope === "all"
                        ? centers.map((c) => c.id)
                        : selected.target_center_ids ?? [];
                    const firstReadByCenter = new Map<string, string>();
                    for (const r of reads) {
                      if (!firstReadByCenter.has(r.center_id))
                        firstReadByCenter.set(r.center_id, r.read_at);
                    }
                    const readCount = targetIds.filter((cid) =>
                      firstReadByCenter.has(cid),
                    ).length;
                    return (
                      <div className="detail-block">
                        <p className="detail-title">
                          지점별 열람 현황{" "}
                          <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                            {readCount} / {targetIds.length} 지점
                          </span>
                        </p>
                        {targetIds.length === 0 ? (
                          <span className="muted" style={{ fontSize: 13 }}>
                            대상 지점이 없습니다.
                          </span>
                        ) : (
                          <table className="member-table" style={{ marginTop: 0 }}>
                            <thead>
                              <tr>
                                <th>지점</th>
                                <th style={{ width: 100 }}>상태</th>
                                <th style={{ width: 150 }}>최초 열람</th>
                              </tr>
                            </thead>
                            <tbody>
                              {targetIds.map((cid) => {
                                const name =
                                  centers.find((c) => c.id === cid)?.name ?? "-";
                                const at = firstReadByCenter.get(cid);
                                return (
                                  <tr key={cid}>
                                    <td>{name}</td>
                                    <td>
                                      {at ? (
                                        <span className="badge green">열람</span>
                                      ) : (
                                        <span className="badge gray">미열람</span>
                                      )}
                                    </td>
                                    <td className="muted" style={{ fontSize: 12 }}>
                                      {at ? at.slice(0, 16).replace("T", " ") : "-"}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        )}
                      </div>
                    );
                  })()}
                  <div className="detail-block">
                    <p className="detail-title">위험 영역</p>
                    <form action={deleteHqNotice}>
                      <input type="hidden" name="id" value={selected.id} />
                      <ConfirmButton
                        message={`'${selected.title}' 본사 공지를 삭제할까요? (지점 어드민의 열람 페이지에서도 사라집니다)`}
                        className="btn danger"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        본사 공지 삭제
                      </ConfirmButton>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <HqNoticeForm centers={centers} initial={selected} />
                  <div className="detail-block" style={{ marginTop: 16 }}>
                    <form action={publishHqNotice}>
                      <input type="hidden" name="id" value={selected.id} />
                      <ConfirmButton
                        message={`'${selected.title}' 을 지금 발행할까요? 발행 후엔 수정 불가입니다.`}
                        className="btn primary"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        지금 발행
                      </ConfirmButton>
                    </form>
                  </div>
                  <div className="detail-block">
                    <form action={deleteHqNotice}>
                      <input type="hidden" name="id" value={selected.id} />
                      <ConfirmButton
                        message={`'${selected.title}' draft 를 삭제할까요?`}
                        className="btn danger"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  </div>
                </>
              )
            ) : (
              <div className="empty-state">
                <strong>선택된 공지가 없습니다</strong>
                <p>왼쪽 목록에서 선택하거나 [새 본사 공지] 를 누르세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
