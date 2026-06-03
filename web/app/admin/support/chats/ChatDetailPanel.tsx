"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useChatDrawer } from "./ChatDrawerContext";
import ConfirmButton from "../../ConfirmButton";
import {
  replyMessage,
  setInquiryStatus,
  deleteInquiry,
} from "../actions";

const SB: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};
const BASE = "/admin/support/chats";

type Inquiry = {
  id: string;
  requester_name: string | null;
  contact: string | null;
  channel: string;
  subject: string;
  status: string;
  created_at: string;
};
type Message = { id: string; sender: string; body: string; created_at: string };

export default function ChatDetailPanel() {
  const { chatId } = useChatDrawer();
  const router = useRouter();
  const [data, setData] = useState<{ inquiry: Inquiry; messages: Message[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!chatId) {
      setData(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/support/chats/${chatId}`, { cache: "no-store" })
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
  }, [chatId, router]);

  const selected = data?.inquiry ?? null;
  const messages = data?.messages ?? [];
  const back = selected ? `${BASE}?sel=${selected.id}` : BASE;

  return (
    <div className="panel">
      {!chatId || !selected ? (
        <>
          <div className="panel-head">
            <p className="panel-title">대화창</p>
          </div>
          <div className="panel-body">
            {!chatId ? (
              <div className="empty-state">
                <strong>채팅을 선택하세요</strong>
                <p>좌측에서 채팅을 선택하면 대화·상태 처리를 진행할 수 있습니다.</p>
              </div>
            ) : loading ? (
              <div className="empty-state">
                <strong>불러오는 중...</strong>
              </div>
            ) : (
              <div className="empty-state">
                <strong>불러오기 실패</strong>
              </div>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="panel-head">
            <p className="panel-title">
              {selected.requester_name ?? "익명"}{" "}
              <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                {selected.contact ?? ""}
              </span>
            </p>
            <span className={`badge ${SB[selected.status] ?? "gray"}`}>{selected.status}</span>
          </div>
          <div className="panel-body">
            <div className="detail-block" style={{ marginTop: 0 }}>
              <div className="message-list">
                {messages.length === 0 && <div className="muted">아직 메시지가 없습니다.</div>}
                {messages.map((m) => (
                  <div key={m.id} className={`msg${m.sender === "admin" ? " me" : ""}`}>
                    {m.body}
                    <small>{m.created_at.slice(0, 16).replace("T", " ")}</small>
                  </div>
                ))}
              </div>
              <form
                action={replyMessage.bind(null, selected.id)}
                style={{ marginTop: 10, display: "flex", gap: 8 }}
              >
                <input type="hidden" name="back" value={back} />
                <input
                  name="body"
                  placeholder="메시지 입력..."
                  style={{
                    flex: 1,
                    border: "1px solid var(--line-strong)",
                    borderRadius: 8,
                    padding: "9px 10px",
                  }}
                />
                <button className="btn primary">전송</button>
              </form>
            </div>

            <div className="detail-block">
              <p className="detail-title">상태 처리</p>
              <div className="action-grid">
                {["접수", "처리중", "완료"].map((x) => (
                  <form key={x} action={setInquiryStatus.bind(null, selected.id, x)}>
                    <input type="hidden" name="back" value={back} />
                    <button
                      className={`btn${x === "완료" ? " primary" : ""}`}
                      style={{ width: "100%" }}
                      disabled={selected.status === x}
                    >
                      {x}
                    </button>
                  </form>
                ))}
                <form action={deleteInquiry.bind(null, selected.id)}>
                  <input type="hidden" name="back" value={BASE} />
                  <ConfirmButton
                    message={`'${selected.requester_name ?? "익명"}' 와의 채팅을 삭제할까요? 메시지 이력도 함께 사라집니다.`}
                    className="btn danger"
                    style={{ width: "100%" }}
                    type="submit"
                  >
                    삭제
                  </ConfirmButton>
                </form>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
