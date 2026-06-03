"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInquiryDrawer } from "./InquiryDrawerContext";
import ConfirmButton from "../ConfirmButton";
import ChatBubble, { formatChatTime } from "../ChatBubble";
import {
  replyBranchInquiry,
  closeBranchInquiry,
  reopenBranchInquiry,
} from "../branch-inquiries/actions";

const STATUS_BADGE: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};

type Inquiry = {
  id: string;
  subject: string;
  body: string;
  status: string;
  center_id: string;
  centers: { name: string } | null;
  created_at: string;
};

type Message = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  attachments?: {
    id: string;
    fileName: string;
    mimeType: string | null;
    sizeBytes: number | null;
    url: string;
  }[];
};

export default function InquiryDetailPanel() {
  const { inquiryId } = useInquiryDrawer();
  const router = useRouter();
  const [data, setData] = useState<{ inquiry: Inquiry; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inquiryId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/hq-inquiries/${inquiryId}`, { cache: "no-store" })
      .then(async (res) => {
        if (!res.ok) throw new Error("fetch_failed");
        return res.json();
      })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
          router.refresh();
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [inquiryId, router]);

  const selected = data?.inquiry ?? null;
  const messages = data?.messages ?? [];

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">{selected ? selected.subject : "문의 상세"}</p>
      </div>
      <div className="panel-body">
        {!inquiryId ? (
          <div className="empty-state">
            <strong>선택된 문의가 없습니다</strong>
            <p>왼쪽 목록에서 문의를 선택해 주세요.</p>
          </div>
        ) : loading || !selected ? (
          <div className="empty-state">
            <strong>불러오는 중...</strong>
          </div>
        ) : (
          <>
            <div className="detail-block" style={{ marginTop: 0 }}>
              <div className="info-list">
                <div className="info-row">
                  <span>지점</span>
                  <strong>{selected.centers?.name ?? "-"}</strong>
                </div>
                <div className="info-row">
                  <span>상태</span>
                  <strong>
                    <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
                      {selected.status}
                    </span>
                  </strong>
                </div>
              </div>
            </div>

            <div className="detail-block">
              <p className="detail-title">대화 ({messages.length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    side={m.sender === "hq" ? "me" : "them"}
                    label={m.sender === "hq" ? "본사" : "지점"}
                    time={formatChatTime(m.created_at)}
                    body={m.body}
                    attachments={m.attachments}
                  />
                ))}
              </div>
            </div>

            {selected.status !== "완료" && (
              <div className="detail-block">
                <p className="detail-title">본사 답변</p>
                <form action={replyBranchInquiry}>
                  <input type="hidden" name="inquiry_id" value={selected.id} />
                  <input type="hidden" name="sender_role" value="hq" />
                  <textarea name="body" rows={3} required placeholder="본사 답변" />
                  <div className="detail-actions" style={{ marginTop: 8 }}>
                    <button type="submit" className="btn primary">전송</button>
                  </div>
                </form>
              </div>
            )}

            <div className="detail-block">
              {selected.status === "완료" ? (
                <form action={reopenBranchInquiry}>
                  <input type="hidden" name="inquiry_id" value={selected.id} />
                  <button type="submit" className="btn" style={{ width: "100%" }}>
                    재오픈
                  </button>
                </form>
              ) : (
                <form action={closeBranchInquiry}>
                  <input type="hidden" name="inquiry_id" value={selected.id} />
                  <ConfirmButton
                    message="이 문의를 완료 처리할까요?"
                    className="btn"
                    type="submit"
                    style={{ width: "100%" }}
                  >
                    완료 처리
                  </ConfirmButton>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
