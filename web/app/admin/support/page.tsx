import { createClient } from "@/lib/supabase/server";
import {
  createInquiry,
  replyMessage,
  setInquiryStatus,
  deleteInquiry,
} from "./actions";

const SB: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};

export default async function SupportPage({
  searchParams,
}: {
  searchParams: Promise<{ sel?: string; s?: string }>;
}) {
  const { sel, s } = await searchParams;
  const supabase = await createClient();

  let q = supabase
    .from("inquiries")
    .select("id, requester_name, contact, channel, subject, body, status, created_at")
    .order("created_at", { ascending: false });
  if (s && ["접수", "처리중", "완료"].includes(s)) q = q.eq("status", s);
  const { data } = await q;
  const list = (data ?? []) as {
    id: string;
    requester_name: string | null;
    contact: string | null;
    channel: string;
    subject: string;
    body: string | null;
    status: string;
    created_at: string;
  }[];

  const selected = sel ? list.find((i) => i.id === sel) ?? null : null;
  let messages: { id: string; sender: string; body: string; created_at: string }[] =
    [];
  if (selected) {
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id, sender, body, created_at")
      .eq("inquiry_id", selected.id)
      .order("created_at", { ascending: true });
    messages = msgs ?? [];
  }

  const cnt = (x: string) => list.filter((i) => i.status === x).length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>문의/채팅 상담</h1>
          <p className="subtext">문의 접수 · 1:1 답변 · 처리 이력</p>
        </div>
        <div className="toolbar">
          <a className="btn" href="/admin/support">
            전체
          </a>
          {["접수", "처리중", "완료"].map((x) => (
            <a
              key={x}
              className={`btn${s === x ? " toggle-active" : ""}`}
              href={`/admin/support?s=${encodeURIComponent(x)}`}
            >
              {x}
            </a>
          ))}
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 문의</span><strong>{list.length}</strong></div>
        <div className="summary-card"><span>접수</span><strong>{cnt("접수")}</strong></div>
        <div className="summary-card"><span>처리중</span><strong>{cnt("처리중")}</strong></div>
        <div className="summary-card"><span>완료</span><strong>{cnt("완료")}</strong></div>
        <div className="summary-card"><span>처리율</span><strong>
          {list.length ? Math.round((cnt("완료") / list.length) * 100) : 0}%
        </strong></div>
      </div>

      <div className="grid account-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">문의 목록</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>제목</th>
                <th>요청자</th>
                <th>채널</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((i) => (
                <tr key={i.id} className={i.id === sel ? "selected" : ""}>
                  <td>
                    <a
                      href={`/admin/support?sel=${i.id}`}
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {i.subject}
                    </a>
                    <div className="muted">{i.created_at.slice(0, 10)}</div>
                  </td>
                  <td className="muted">{i.requester_name ?? "-"}</td>
                  <td className="muted">{i.channel}</td>
                  <td>
                    <span className={`badge ${SB[i.status] ?? "gray"}`}>
                      {i.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <strong>문의가 없습니다</strong>
                      <p>우측에서 전화/방문 문의를 직접 등록할 수 있습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          {!selected ? (
            <>
              <div className="panel-head">
                <p className="panel-title">문의 등록</p>
              </div>
              <form action={createInquiry} className="panel-body">
                <div className="field">
                  <label>제목 *</label>
                  <input name="subject" />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>요청자</label>
                  <input name="requester_name" />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>연락처</label>
                  <input name="contact" />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>채널</label>
                  <select name="channel" defaultValue="웹">
                    <option>웹</option>
                    <option>전화</option>
                    <option>방문</option>
                    <option>앱</option>
                  </select>
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>내용</label>
                  <textarea name="body" />
                </div>
                <div className="detail-actions">
                  <button className="btn primary">문의 등록</button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="panel-head">
                <p className="panel-title">{selected.subject}</p>
                <span className={`badge ${SB[selected.status] ?? "gray"}`}>
                  {selected.status}
                </span>
              </div>
              <div className="panel-body">
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <div className="info-list">
                    <div className="info-row">
                      <span>요청자</span>
                      <strong>{selected.requester_name ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>연락처</span>
                      <strong>{selected.contact ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>채널</span>
                      <strong>{selected.channel}</strong>
                    </div>
                  </div>
                  {selected.body && (
                    <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                      {selected.body}
                    </div>
                  )}
                </div>

                <div className="detail-block">
                  <p className="detail-title">대화</p>
                  <div className="message-list">
                    {messages.length === 0 && (
                      <div className="muted">아직 답변이 없습니다.</div>
                    )}
                    {messages.map((m) => (
                      <div
                        key={m.id}
                        className={`msg${m.sender === "admin" ? " me" : ""}`}
                      >
                        {m.body}
                        <small>{m.created_at.slice(0, 16).replace("T", " ")}</small>
                      </div>
                    ))}
                  </div>
                  <form
                    action={replyMessage.bind(null, selected.id)}
                    style={{ marginTop: 10, display: "flex", gap: 8 }}
                  >
                    <input
                      name="body"
                      placeholder="답변 입력..."
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
                      <form
                        key={x}
                        action={setInquiryStatus.bind(null, selected.id, x)}
                      >
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
                      <button className="btn danger" style={{ width: "100%" }}>
                        삭제
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
