"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useInquiryDrawer } from "./InquiryDrawerContext";
import ConfirmButton from "../ConfirmButton";
import ChatBubble, { formatChatTime } from "../ChatBubble";
import {
  createBranchInquiry,
  replyBranchInquiry,
  closeBranchInquiry,
  reopenBranchInquiry,
} from "./actions";

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
  created_at: string;
};

type Message = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
};

export default function InquiryDetailPanel() {
  const { inquiryId, setInquiryId } = useInquiryDrawer();
  const router = useRouter();
  const [data, setData] = useState<{ inquiry: Inquiry; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!inquiryId || inquiryId === "new") {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/branch-inquiries/${inquiryId}`, { cache: "no-store" })
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

  const isNew = inquiryId === "new";
  const selected = data?.inquiry ?? null;
  const messages = data?.messages ?? [];

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">
          {isNew ? "새 본사 문의" : selected ? selected.subject : "문의 상세"}
        </p>
      </div>
      <div className="panel-body">
        {isNew ? (
          <form action={createBranchInquiry}>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>제목 *</label>
              <input name="subject" required maxLength={120} placeholder="예: 본사 결제 시스템 문의" />
            </div>
            <div className="field" style={{ marginBottom: 12 }}>
              <label>본문 *</label>
              <textarea name="body" rows={6} required placeholder="문의 내용을 입력하세요" />
            </div>
            <div className="detail-actions">
              <button type="button" className="btn" onClick={() => setInquiryId(null)}>
                취소
              </button>
              <button type="submit" className="btn primary">문의 보내기</button>
            </div>
          </form>
        ) : !inquiryId ? (
          <div className="empty-state">
            <strong>선택된 문의가 없습니다</strong>
            <p>왼쪽 목록에서 선택하거나 [새 문의 작성] 을 누르세요.</p>
          </div>
        ) : loading || !selected ? (
          <div className="empty-state">
            <strong>불러오는 중...</strong>
          </div>
        ) : (
          <>
            <div className="detail-block" style={{ marginTop: 0 }}>
              <p className="detail-title">
                상태{" "}
                <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
                  {selected.status}
                </span>
              </p>
            </div>

            <div className="detail-block">
              <p className="detail-title">대화 ({messages.length})</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    side={m.sender === "hq" ? "them" : "me"}
                    label={m.sender === "hq" ? "본사" : "지점"}
                    time={formatChatTime(m.created_at)}
                    body={m.body}
                  />
                ))}
              </div>
            </div>

            {selected.status !== "완료" && (
              <div className="detail-block">
                <p className="detail-title">답글 작성</p>
                <form action={replyBranchInquiry}>
                  <input type="hidden" name="inquiry_id" value={selected.id} />
                  <input type="hidden" name="sender_role" value="admin" />
                  <textarea name="body" rows={3} required placeholder="답글 내용" />
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
