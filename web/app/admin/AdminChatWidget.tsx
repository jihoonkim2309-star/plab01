"use client";

import { useCallback, useEffect, useState } from "react";
import { Headset, X, ChevronLeft } from "lucide-react";
import ChatBubble, { formatChatTime } from "./ChatBubble";
import ChatComposer from "./ChatComposer";
import ChatScrollAnchor from "./ChatScrollAnchor";
import { replyMessage } from "./support/actions";
import { sendBranchChatAsAdmin } from "./branch-chat/actions";
import { createClient } from "@/lib/supabase/client";

type Conv = {
  id: string;
  name: string;
  role: string | null;
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
type ChatThread = {
  inquiry: { id: string; requester_name: string | null; contact: string | null; status: string };
  messages: Message[];
};
type BranchThread = { inquiry: { id: string; status: string }; messages: Message[] };

const SB: Record<string, string> = { 접수: "orange", 처리중: "blue", 완료: "green" };

export default function AdminChatWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"chat" | "branch">("chat");
  // 이용자 1:1
  const [convs, setConvs] = useState<Conv[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  // 본사 채팅
  const [branchUnread, setBranchUnread] = useState(0);
  const [branch, setBranch] = useState<BranchThread | null>(null);
  const [loadingBranch, setLoadingBranch] = useState(false);

  const loadList = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/widget/chats", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setConvs(d.conversations ?? []);
      setUnreadTotal(d.unreadTotal ?? 0);
      setBranchUnread(d.branchUnread ?? 0);
    } catch {
      /* ignore */
    }
  }, []);

  const loadThread = useCallback(async (id: string) => {
    try {
      const r = await fetch(`/api/admin/support/chats/${id}`, { cache: "no-store" });
      if (r.ok) setThread(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  const loadBranch = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/widget/branch", { cache: "no-store" });
      if (r.ok) setBranch(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    loadList();
  }, [loadList]);

  // realtime — 새 메시지 시 뱃지 + 열린 스레드 갱신
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
          setTab((t) => {
            if (t === "branch") loadBranch();
            return t;
          });
        },
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [loadList, loadThread, loadBranch]);

  const openConv = useCallback(
    (c: Conv) => {
      setActiveId(c.id);
      setActiveRole(c.role);
      setThread(null);
      setLoadingThread(true);
      loadThread(c.id).finally(() => setLoadingThread(false));
      setTimeout(loadList, 400);
    },
    [loadThread, loadList],
  );

  const switchTab = useCallback(
    (t: "chat" | "branch") => {
      setTab(t);
      if (t === "branch") {
        setLoadingBranch(true);
        loadBranch().finally(() => setLoadingBranch(false));
        setTimeout(loadList, 400);
      }
    },
    [loadBranch, loadList],
  );

  const totalUnread = unreadTotal + branchUnread;
  const chatMsgs = thread?.messages ?? [];
  const branchMsgs = branch?.messages ?? [];
  const inChatThread = tab === "chat" && !!activeId;

  return (
    <>
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
        {!open && totalUnread > 0 && (
          <span className="admin-cw-fab-badge">{totalUnread > 9 ? "9+" : totalUnread}</span>
        )}
      </button>

      {open && (
        <div className="admin-cw-panel" role="dialog" aria-label="상담 채팅">
          {inChatThread ? (
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
              {activeRole && <span className="admin-cw-role">{activeRole}</span>}
              {thread && (
                <span className={`badge ${SB[thread.inquiry.status] ?? "gray"}`}>
                  {thread.inquiry.status}
                </span>
              )}
            </div>
          ) : (
            <>
              <div className="admin-cw-head">
                <strong>대화</strong>
              </div>
              <div className="admin-cw-tabs">
                <button
                  type="button"
                  className={`admin-cw-tab${tab === "chat" ? " active" : ""}`}
                  onClick={() => switchTab("chat")}
                >
                  이용자 1:1
                  {unreadTotal > 0 && <span className="admin-cw-tab-dot" />}
                </button>
                <button
                  type="button"
                  className={`admin-cw-tab${tab === "branch" ? " active" : ""}`}
                  onClick={() => switchTab("branch")}
                >
                  본사 채팅
                  {branchUnread > 0 && <span className="admin-cw-tab-dot" />}
                </button>
              </div>
            </>
          )}

          {/* 이용자 1:1 — 목록 */}
          {tab === "chat" && !activeId && (
            <div className="admin-cw-list">
              {convs.length === 0 && <div className="admin-cw-empty">아직 대화가 없습니다.</div>}
              {convs.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`admin-cw-row${c.unread ? " unread" : ""}`}
                  onClick={() => openConv(c)}
                >
                  <div className={`admin-cw-avatar${c.role === "학생" ? " student" : ""}`}>
                    {c.name.charAt(0)}
                  </div>
                  <div className="admin-cw-row-main">
                    <div className="admin-cw-row-top">
                      <span className="admin-cw-row-name">{c.name}</span>
                      {c.role && <span className="admin-cw-role">{c.role}</span>}
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
          )}

          {/* 이용자 1:1 — 스레드 */}
          {inChatThread && (
            <>
              <div className="admin-cw-thread chat-thread">
                {loadingThread && chatMsgs.length === 0 && (
                  <div className="admin-cw-empty">불러오는 중...</div>
                )}
                {!loadingThread && chatMsgs.length === 0 && (
                  <div className="admin-cw-empty">아직 메시지가 없습니다.</div>
                )}
                {chatMsgs.map((m) => (
                  <ChatBubble
                    key={m.id}
                    side={m.sender === "admin" ? "me" : "them"}
                    label={m.sender === "admin" ? undefined : thread?.inquiry.requester_name ?? "고객"}
                    time={formatChatTime(m.created_at)}
                    body={m.body}
                    attachments={m.attachments}
                  />
                ))}
                <ChatScrollAnchor k={`${chatMsgs.length}-${chatMsgs[chatMsgs.length - 1]?.id ?? ""}`} />
              </div>
              <form
                action={replyMessage.bind(null, activeId)}
                data-no-loading="true"
                className="admin-cw-form"
              >
                <input type="hidden" name="back" value="/admin" />
                <ChatComposer placeholder="메시지 입력" rows={1} />
                <button className="btn primary admin-cw-send" type="submit">전송</button>
              </form>
            </>
          )}

          {/* 본사 채팅 — 단일 스레드 */}
          {tab === "branch" && (
            <>
              <div className="admin-cw-thread chat-thread">
                {loadingBranch && branchMsgs.length === 0 && (
                  <div className="admin-cw-empty">불러오는 중...</div>
                )}
                {!loadingBranch && branchMsgs.length === 0 && (
                  <div className="admin-cw-empty">본사와의 대화를 시작해 보세요.</div>
                )}
                {branchMsgs.map((m) => (
                  <ChatBubble
                    key={m.id}
                    side={m.sender === "admin" ? "me" : "them"}
                    label={m.sender === "admin" ? undefined : "본사"}
                    time={formatChatTime(m.created_at)}
                    body={m.body}
                    attachments={m.attachments}
                  />
                ))}
                <ChatScrollAnchor k={`b-${branchMsgs.length}-${branchMsgs[branchMsgs.length - 1]?.id ?? ""}`} />
              </div>
              <form
                action={sendBranchChatAsAdmin}
                data-no-loading="true"
                className="admin-cw-form"
              >
                <ChatComposer placeholder="본사에 메시지" rows={1} />
                <button className="btn primary admin-cw-send" type="submit">전송</button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
