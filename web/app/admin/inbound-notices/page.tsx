import Link from "next/link";
import { requireCenter } from "@/lib/center";
import RefreshOnce from "../RefreshOnce";

export default async function InboundNoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string }>;
}) {
  const { id } = await searchParams;
  const { supabase, centerId, userId } = await requireCenter();

  // 상세 진입 시 멱등 mark_read — RLS 가 자기 지점·본인만 허용
  if (id) {
    await supabase
      .from("hq_notice_reads")
      .upsert(
        { notice_id: id, center_id: centerId, user_id: userId },
        { onConflict: "notice_id,user_id" },
      );
  }

  // RLS 로 자기 지점 대상 + 발행된 공지만 노출됨
  const [listRes, selectedRes, readsRes] = await Promise.all([
    supabase
      .from("hq_notices")
      .select("id, title, scope, published_at, notified_count")
      .order("published_at", { ascending: false })
      .limit(200),
    id
      ? supabase
          .from("hq_notices")
          .select("id, title, body, scope, published_at")
          .eq("id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
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
  const selected = selectedRes.data as
    | (Row & { body: string })
    | null;
  const readSet = new Set(
    ((readsRes.data ?? []) as { notice_id: string }[]).map((r) => r.notice_id),
  );

  return (
    <>
      {id && <RefreshOnce k={id} />}
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
                    <tr
                      key={n.id}
                      className={`row-link-host ${n.id === id ? "selected" : ""}`}
                    >
                      <td>
                        <Link
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
                        </Link>
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

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">{selected ? selected.title : "공지 상세"}</p>
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 공지가 없습니다</strong>
                <p>왼쪽 목록에서 본사 공지를 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">발행 정보</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>발행일시</span>
                      <strong>
                        {selected.published_at?.slice(0, 16).replace("T", " ") ?? "-"}
                      </strong>
                    </div>
                    <div className="info-row">
                      <span>대상</span>
                      <strong>
                        {selected.scope === "all" ? "전체 지점" : "특정 지점"}
                      </strong>
                    </div>
                  </div>
                </div>
                <div className="detail-block">
                  <p className="detail-title">본문</p>
                  <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>
                    {selected.body}
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
