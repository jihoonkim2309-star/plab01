"use client";

import { useEffect, useState } from "react";
import { useNoticeDrawer } from "./NoticeDrawerContext";
import ConfirmButton from "../ConfirmButton";
import HqNoticeForm from "./HqNoticeForm";
import { publishHqNotice, deleteHqNotice } from "./actions";

const SCOPE_LABEL: Record<string, string> = {
  all: "전체 지점",
  centers: "특정 지점",
};

type Notice = {
  id: string;
  title: string;
  body: string;
  scope: string;
  target_center_ids: string[] | null;
  published_at: string | null;
  notified_count: number;
  created_at: string;
};
type Read = { center_id: string; user_id: string; read_at: string };
type Center = { id: string; name: string };

export default function NoticeDetailPanel({
  initialCenters,
}: {
  initialCenters: Center[];
}) {
  const { noticeId, setNoticeId } = useNoticeDrawer();
  const [data, setData] = useState<{
    notice: Notice;
    reads: Read[];
    centers: Center[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!noticeId || noticeId === "new") {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/hq-notices/${noticeId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noticeId]);

  const isNew = noticeId === "new";
  const selected = data?.notice ?? null;
  const reads = data?.reads ?? [];
  const centers = data?.centers ?? initialCenters;

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">
          {isNew ? "새 본사 공지" : selected ? selected.title : "공지 상세"}
        </p>
      </div>
      <div className="panel-body">
        {isNew ? (
          <>
            <HqNoticeForm centers={initialCenters} />
            <div className="detail-actions" style={{ marginTop: 12 }}>
              <button type="button" className="btn" onClick={() => setNoticeId(null)}>
                취소
              </button>
            </div>
          </>
        ) : !noticeId ? (
          <div className="empty-state">
            <strong>선택된 공지가 없습니다</strong>
            <p>왼쪽 목록에서 선택하거나 [새 본사 공지] 를 누르세요.</p>
          </div>
        ) : loading || !selected ? (
          <div className="empty-state">
            <strong>불러오는 중...</strong>
          </div>
        ) : selected.published_at ? (
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
        )}
      </div>
    </div>
  );
}
