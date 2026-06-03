import { requireCenter } from "@/lib/center";
import { NoticeDrawerProvider } from "./NoticeDrawerContext";
import NoticeRowLink from "./NoticeRowLink";
import NoticeDetailPanel from "./NoticeDetailPanel";

export default async function InboundNoticesPage() {
  const { supabase, userId } = await requireCenter();

  // 좌측 목록 + 본인 readSet 만 server fetch.
  // 우측 상세는 client (NoticeDetailPanel) 가 클릭 시 자체 fetch + mark_read.
  const [listRes, readsRes] = await Promise.all([
    supabase
      .from("hq_notices")
      .select("id, title, scope, published_at, notified_count")
      .order("published_at", { ascending: false })
      .limit(200),
    supabase
      .from("hq_notice_reads")
      .select("notice_id")
      .eq("user_id", userId),
  ]);

  type Row = {
    id: string;
    title: string;
    scope: string;
    published_at: string | null;
    notified_count: number;
  };
  const list = (listRes.data ?? []) as unknown as Row[];
  const readSet = new Set(
    ((readsRes.data ?? []) as { notice_id: string }[]).map((r) => r.notice_id),
  );

  return (
    <NoticeDrawerProvider>
      <div className="page-head">
        <div>
          <h1>본사 공지</h1>
          <p className="subtext">본사가 우리 지점에 보낸 공지 (열람 전용)</p>
        </div>
      </div>

      <div className="grid member-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              받은 공지{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {list.length}건
              </span>
            </p>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>제목</th>
                  <th style={{ width: 110 }}>대상</th>
                  <th style={{ width: 130 }}>발행일</th>
                </tr>
              </thead>
              <tbody>
                {list.map((n) => {
                  const isUnread = !readSet.has(n.id);
                  return (
                    <tr key={n.id} className="row-link-host">
                      <td>
                        <NoticeRowLink
                          noticeId={n.id}
                          href={`/admin/inbound-notices?id=${n.id}`}
                          className="row-link-stretch"
                          style={{
                            fontWeight: isUnread ? 800 : 600,
                            color: isUnread ? "var(--text)" : "#6f7d78",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {isUnread && (
                            <span
                              aria-label="새 공지"
                              style={{
                                display: "inline-block",
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#e53935",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {n.title}
                          {isUnread && (
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                color: "#e53935",
                                background: "#fde7e7",
                                padding: "1px 6px",
                                borderRadius: 4,
                                lineHeight: 1.4,
                              }}
                            >
                              NEW
                            </span>
                          )}
                        </NoticeRowLink>
                      </td>
                      <td className="muted">
                        {n.scope === "all" ? "전체 지점" : "특정 지점"}
                      </td>
                      <td className="muted">
                        {n.published_at ? n.published_at.slice(0, 10) : "-"}
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">
                        <strong>받은 본사 공지가 없습니다</strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <NoticeDetailPanel />
      </div>
    </NoticeDrawerProvider>
  );
}
