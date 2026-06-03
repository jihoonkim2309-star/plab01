"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useNoticeDrawer } from "./NoticeDrawerContext";

type Notice = {
  id: string;
  title: string;
  body: string;
  scope: string;
  published_at: string | null;
};

// 우측 공지 상세 panel — context 의 noticeId 변경 시 자체 fetch.
// API 가 mark_read 도 함께 수행하므로 fetch 후 사이드바 갱신 위해 router.refresh.
export default function NoticeDetailPanel() {
  const { noticeId } = useNoticeDrawer();
  const router = useRouter();
  const [data, setData] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!noticeId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/inbound-notices/${noticeId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((d: Notice) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
          // mark_read 가 일어났으므로 사이드바 뱃지 갱신 — Realtime 이 잡지만 보수적으로
          router.refresh();
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [noticeId, router]);

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">{data?.title ?? "공지 상세"}</p>
      </div>
      <div className="panel-body">
        {!noticeId ? (
          <div className="empty-state">
            <strong>선택된 공지가 없습니다</strong>
            <p>왼쪽 목록에서 본사 공지를 선택해 주세요.</p>
          </div>
        ) : loading || !data ? (
          <div className="empty-state">
            <strong>불러오는 중...</strong>
          </div>
        ) : (
          <>
            <div className="detail-block" style={{ marginTop: 0 }}>
              <p className="detail-title">발행 정보</p>
              <div className="info-list">
                <div className="info-row">
                  <span>발행일시</span>
                  <strong>
                    {data.published_at?.slice(0, 16).replace("T", " ") ?? "-"}
                  </strong>
                </div>
                <div className="info-row">
                  <span>대상</span>
                  <strong>
                    {data.scope === "all" ? "전체 지점" : "특정 지점"}
                  </strong>
                </div>
              </div>
            </div>
            <div className="detail-block">
              <p className="detail-title">본문</p>
              <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{data.body}</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
