"use client";

import { useOptimistic } from "react";
import ChatBubble, { formatChatTime } from "@/app/admin/ChatBubble";
import ChatComposer from "@/app/admin/ChatComposer";
import ChatScrollAnchor from "@/app/admin/ChatScrollAnchor";
import type { ChatAttachment } from "@/app/admin/ChatBubble";

// RSC 채팅 페이지 공용 — 메시지 목록 + 입력창을 한 클라 컴포넌트로 묶어
// useOptimistic 으로 전송 즉시 말풍선 표시. 서버액션 완료(revalidate)로 messages
// prop 이 갱신되면 낙관적 상태가 실제 데이터로 자동 rebase (중복/잔상 없음).
//
// realtime 갱신은 페이지의 ChatLive(router.refresh) 가 담당 → messages prop 갱신.

export type ThreadMsg = {
  id: string;
  sender: string;
  body: string;
  created_at: string;
  attachments?: ChatAttachment[];
};

let optimSeq = 0;

export default function LiveChatThread({
  messages,
  action,
  meSenders,
  themLabel,
  placeholder,
  hiddenFields,
  emptyTitle = "아직 메시지가 없습니다",
  emptyDesc = "아래 입력창에 첫 메시지를 보내 보세요.",
  threadStyle,
  rows,
}: {
  messages: ThreadMsg[];
  // 서버 액션 (formData 받음)
  action: (formData: FormData) => Promise<void> | void;
  // "me"(내 메시지)로 볼 sender 값들
  meSenders: string[];
  // 상대 말풍선 위 라벨
  themLabel: string;
  placeholder: string;
  // 폼 내부 hidden input (이름→값). inquiry_id / center_id / back 등.
  hiddenFields?: Record<string, string | undefined>;
  emptyTitle?: string;
  emptyDesc?: string;
  threadStyle?: React.CSSProperties;
  rows?: number;
}) {
  const [optimistic, addOptimistic] = useOptimistic(
    messages,
    (state: ThreadMsg[], m: ThreadMsg) => [...state, m],
  );

  async function formAction(formData: FormData) {
    const body = String(formData.get("body") ?? "").trim();
    if (body) {
      optimSeq += 1;
      addOptimistic({
        id: `tmp-${optimSeq}`,
        sender: meSenders[0],
        body,
        created_at: new Date().toISOString(),
      });
    }
    await action(formData);
  }

  const isMe = (s: string) => meSenders.includes(s);

  return (
    <>
      <div className="chat-thread" style={threadStyle ?? { flex: 1 }}>
        {optimistic.length === 0 ? (
          <div className="empty-state">
            <strong>{emptyTitle}</strong>
            <p>{emptyDesc}</p>
          </div>
        ) : (
          optimistic.map((m) => (
            <ChatBubble
              key={m.id}
              side={isMe(m.sender) ? "me" : "them"}
              label={isMe(m.sender) ? undefined : themLabel}
              time={formatChatTime(m.created_at)}
              body={m.body}
              attachments={m.attachments}
            />
          ))
        )}
        <ChatScrollAnchor
          k={`${optimistic.length}-${optimistic[optimistic.length - 1]?.id ?? ""}`}
        />
      </div>
      <form action={formAction} data-no-loading="true" className="chat-input-form">
        {Object.entries(hiddenFields ?? {})
          .filter(([, v]) => v != null)
          .map(([k, v]) => (
            <input key={k} type="hidden" name={k} value={v} />
          ))}
        <ChatComposer placeholder={placeholder} rows={rows} />
        <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>
          전송
        </button>
      </form>
    </>
  );
}
