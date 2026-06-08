"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Headset, X, ChevronLeft } from "lucide-react";
import ChatBubble, { formatChatTime } from "./ChatBubble";
import ChatComposer from "./ChatComposer";
import ChatScrollAnchor from "./ChatScrollAnchor";
import { replyMessage } from "./support/actions";
import { createClient } from "@/lib/supabase/client";

type Conv = {
  id: string;
  name: string;
  status: string;
  lastBody: string;
  lastSender: string | null;
  lastAt: string;
  unread: boolean;
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
type Thread = {
  inquiry: { id: string; requester_name: string | null; contact: string | null; status: string };
  messages: Message[];
};

const SB: Record<string, string> = { 접수: "orange", 처리중: "blue", 완료: "green" };

export default function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [convs, setConvs] = useState<Conv[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [thread, setThread] = useState<Thread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/widget/chats", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setConvs(d.conversations ?? []);
      setUnreadTotal(d.unreadTotal ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/admin/support/chats/${id}`, { cache: "no-store" });
      if (!r.ok) return;
      setThread(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  // 최초 + 주기적 뱃지 갱신
  useEffect(() => {
    loadList();
  }, [loadList]);

  // realtime — 새 메시지 시 목록(뱃지) + 열린 스레드 갱신
  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`admin-chat-widget-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        () => {
          loadList();
          setActiveId((cur) => {
            if (cur) loadThread(cur);
            return cur;
          });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [loadList, loadThread]);

  const openConv = useCallback(
    (id: string) => {
      setActiveId(id);
      setThread(null);
      setLoadingThread(true);
      loadThread(id).finally(() => setLoadingThread(false));
      // 열람 → 잠시 후 목록 뱃지 갱신 (mark_read 반영)
      setTimeout(loadList, 400);
    },
    [loadThread, loadList],
  );

  const messages = thread?.messages ?? [];

  return (
    <>
      {/* 플로팅 버튼 */}
      <button
        type="button"
        className="admin-cw-fab"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) loadList();
        }}
        aria-label="상담 채팅"
      >
        {open ? <X size={22} /> : <Headset size={22} />}
        {!open && unreadTotal > 0 && (
          <span className="admin-cw-fab-badge">{unreadTotal > 9 ? "9+" : unreadTotal}</span>
        )}
      </button>

      {open && (
        <div className="admin-cw-panel" role="dialog" aria-label="상담 채팅">
          {!activeId ? (
            /* 대화 목록 */
            <>
              <div className="admin-cw-head">
                <strong>대화</strong>
                <span className="admin-cw-sub">학부모·학생 1:1 상담</span>
              </div>
              <div className="admin-cw-list">
                {convs.length === 0 && <div className="admin-cw-empty">아직 대화가 없습니다.</div>}
                {convs.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    className={`admin-cw-row${c.unread ? " unread" : ""}`}
                    onClick={() => openConv(c.id)}
                  >
                    <div className="admin-cw-avatar">{c.name.charAt(0)}</div>
                    <div className="admin-cw-row-main">
                      <div className="admin-cw-row-top">
                        <span className="admin-cw-row-name">{c.name}</span>
                        <span className="admin-cw-row-time">{formatChatTime(c.lastAt)}</span>
                      </div>
                      <div className="admin-cw-row-last">
                        {c.lastSender === "admin" ? "나: " : ""}
                        {c.lastBody || "(메시지 없음)"}
                      </div>
                    </div>
                    {c.unread && <span className="admin-cw-dot" />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            /* 스레드 */
            <>
              <div className="admin-cw-head admin-cw-thread-head">
                <button
                  type="button"
                  className="admin-cw-back"
                  onClick={() => {
                    setActiveId(null);
                    setThread(null);
                    loadList();
                  }}
                  aria-label="목록"
                >
                  <ChevronLeft size={18} />
                </button>
                <strong>{thread?.inquiry.requester_name ?? "고객"}</strong>
                {thread && (
                  <span className={`badge ${SB[thread.inquiry.status] ?? "gray"}`}>
                    {thread.inquiry.status}
                  </span>
                )}
              </div>
              <div className="admin-cw-thread chat-thread">
                {loadingThread && messages.length === 0 && (
                  <div className="admin-cw-empty">불러오는 중...</div>
                )}
                {!loadingThread && messages.length === 0 && (
                  <div className="admin-cw-empty">아직 메시지가 없습니다.</div>
                )}
                {messages.map((m) => (
                  <ChatBubble
                    key={m.id}
                    side={m.sender === "admin" ? "me" : "them"}
                    label={m.sender === "admin" ? undefined : thread?.inquiry.requester_name ?? "고객"}
                    time={formatChatTime(m.created_at)}
                    body={m.body}
                    attachments={m.attachments}
                  />
                ))}
                <ChatScrollAnchor k={`${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
              </div>
              <form
                action={replyMessage.bind(null, activeId)}
                data-no-loading="true"
                className="admin-cw-form chat-input-form"
              >
                <input type="hidden" name="back" value="/admin" />
                <ChatComposer placeholder="메시지 입력" rows={1} />
                <button className="btn primary" type="submit">전송</button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
