"use client";

import { useCallback, useEffect, useState } from "react";
import { Headset, X, ChevronLeft } from "lucide-react";
import ChatBubble, { formatChatTime } from "./ChatBubble";
import ChatComposer from "./ChatComposer";
import ChatScrollAnchor from "./ChatScrollAnchor";
import { replyMessage } from "./support/actions";
import { sendBranchChatAsAdmin, sendBranchChatAsHq } from "./branch-chat/actions";
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
type HqConv = {
  centerId: string;
  name: string;
  lastBody: string;
  lastSender: string | null;
  lastAt: string | null;
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
type HqThread = { inquiry: { id: string; centerId: string; name: string }; messages: Message[] };

const SB: Record<string, string> = { 접수: "orange", 처리중: "blue", 완료: "green" };

export default function AdminChatWidget({ mode = "center" }: { mode?: "center" | "hq" }) {
  const [open, setOpen] = useState(false);

  // ===== center 모드 =====
  const [tab, setTab] = useState<"chat" | "branch">("chat");
  const [convs, setConvs] = useState<Conv[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  const [thread, setThread] = useState<ChatThread | null>(null);
  const [loadingThread, setLoadingThread] = useState(false);
  const [branchUnread, setBranchUnread] = useState(0);
  const [branch, setBranch] = useState<BranchThread | null>(null);
  const [loadingBranch, setLoadingBranch] = useState(false);

  // ===== hq 모드 (지점 채팅) =====
  const [hqConvs, setHqConvs] = useState<HqConv[]>([]);
  const [hqUnread, setHqUnread] = useState(0);
  const [hqActive, setHqActive] = useState<{ centerId: string; name: string } | null>(null);
  const [hqThread, setHqThread] = useState<HqThread | null>(null);
  const [loadingHq, setLoadingHq] = useState(false);

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
  const loadHqList = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/widget/hq", { cache: "no-store" });
      if (!r.ok) return;
      const d = await r.json();
      setHqConvs(d.conversations ?? []);
      setHqUnread(d.unreadTotal ?? 0);
    } catch {
      /* ignore */
    }
  }, []);
  const loadHqThread = useCallback(async (centerId: string) => {
    try {
      const r = await fetch(`/api/admin/widget/hq/${centerId}`, { cache: "no-store" });
      if (r.ok) setHqThread(await r.json());
    } catch {
      /* ignore */
    }
  }, []);

  const refreshAll = useCallback(() => {
    if (mode === "hq") {
      loadHqList();
      setHqActive((cur) => {
        if (cur) loadHqThread(cur.centerId);
        return cur;
      });
    } else {
      loadList();
      setActiveId((cur) => {
        if (cur) loadThread(cur);
        return cur;
      });
      setTab((t) => {
        if (t === "branch") loadBranch();
        return t;
      });
    }
  }, [mode, loadHqList, loadHqThread, loadList, loadThread, loadBranch]);

  useEffect(() => {
    if (mode === "hq") loadHqList();
    else loadList();
  }, [mode, loadHqList, loadList]);

  useEffect(() => {
    const sb = createClient();
    const ch = sb
      .channel(`admin-chat-widget-${crypto.randomUUID()}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_messages" },
        () => refreshAll(),
      )
      .subscribe();
    return () => {
      sb.removeChannel(ch);
    };
  }, [refreshAll]);

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
  const openHq = useCallback(
    (c: HqConv) => {
      setHqActive({ centerId: c.centerId, name: c.name });
      setHqThread(null);
      setLoadingHq(true);
      loadHqThread(c.centerId).finally(() => setLoadingHq(false));
      setTimeout(loadHqList, 400);
    },
    [loadHqThread, loadHqList],
  );

  const totalUnread = mode === "hq" ? hqUnread : unreadTotal + branchUnread;
  const chatMsgs = thread?.messages ?? [];
  const branchMsgs = branch?.messages ?? [];
  const hqMsgs = hqThread?.messages ?? [];
  const inChatThread = mode === "center" && tab === "chat" && !!activeId;

  return (
    <>
      <button
        type="button"
        className="admin-cw-fab"
        onClick={() => {
          setOpen((o) => !o);
          if (!open) (mode === "hq" ? loadHqList() : loadList());
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
          {/* ============ HQ 모드 ============ */}
          {mode === "hq" ? (
            hqActive ? (
              <>
                <div className="admin-cw-head admin-cw-thread-head">
                  <button
                    type="button"
                    className="admin-cw-back"
                    onClick={() => {
                      setHqActive(null);
                      setHqThread(null);
                      loadHqList();
                    }}
                    aria-label="목록"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <strong>{hqActive.name}</strong>
                  <span className="admin-cw-role">지점</span>
                </div>
                <div className="admin-cw-thread chat-thread">
                  {loadingHq && hqMsgs.length === 0 && <div className="admin-cw-empty">불러오는 중...</div>}
                  {!loadingHq && hqMsgs.length === 0 && (
                    <div className="admin-cw-empty">이 지점과의 대화를 시작해 보세요.</div>
                  )}
                  {hqMsgs.map((m) => (
                    <ChatBubble
                      key={m.id}
                      side={m.sender === "hq" ? "me" : "them"}
                      label={m.sender === "hq" ? undefined : hqActive.name}
                      time={formatChatTime(m.created_at)}
                      body={m.body}
                      attachments={m.attachments}
                    />
                  ))}
                  <ChatScrollAnchor k={`hq-${hqMsgs.length}-${hqMsgs[hqMsgs.length - 1]?.id ?? ""}`} />
                </div>
                <form action={sendBranchChatAsHq} data-no-loading="true" className="admin-cw-form">
                  <input type="hidden" name="center_id" value={hqActive.centerId} />
                  <ChatComposer placeholder={`${hqActive.name} 에 메시지`} rows={1} />
                  <button className="btn primary admin-cw-send" type="submit">전송</button>
                </form>
              </>
            ) : (
              <>
                <div className="admin-cw-head">
                  <strong>지점 채팅</strong>
                  <span className="admin-cw-sub">본사 ↔ 지점</span>
                </div>
                <div className="admin-cw-list">
                  {hqConvs.length === 0 && <div className="admin-cw-empty">지점이 없습니다.</div>}
                  {hqConvs.map((c) => (
                    <button
                      key={c.centerId}
                      type="button"
                      className={`admin-cw-row${c.unread ? " unread" : ""}`}
                      onClick={() => openHq(c)}
                    >
                      <div className="admin-cw-avatar">{c.name.charAt(0)}</div>
                      <div className="admin-cw-row-main">
                        <div className="admin-cw-row-top">
                          <span className="admin-cw-row-name">{c.name}</span>
                          <span className="admin-cw-row-time">{c.lastAt ? formatChatTime(c.lastAt) : ""}</span>
                        </div>
                        <div className="admin-cw-row-last">
                          {c.lastSender === "hq" ? "나: " : ""}
                          {c.lastBody || "(대화 없음)"}
                        </div>
                      </div>
                      {c.unread && <span className="admin-cw-dot" />}
                    </button>
                  ))}
                </div>
              </>
            )
          ) : (
            /* ============ CENTER 모드 ============ */
            <>
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
                  <form action={sendBranchChatAsAdmin} data-no-loading="true" className="admin-cw-form">
                    <ChatComposer placeholder="본사에 메시지" rows={1} />
                    <button className="btn primary admin-cw-send" type="submit">전송</button>
                  </form>
                </>
              )}
            </>
          )}
        </div>
      )}
    </>
  );
}
