import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";
import ChatComposer from "../../ChatComposer";
import RefreshOnce from "../../RefreshOnce";
import ChatScrollAnchor from "../../ChatScrollAnchor";
import ChatBubble, { formatChatTime } from "../../ChatBubble";
import ConfirmButton from "../../ConfirmButton";
import { replyMessage, setInquiryStatus, deleteInquiry } from "../actions";

const SB: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};
const BASE = "/admin/support/posts";

export default async function SupportPostsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; q?: string; channel?: string; sel?: string }>;
}) {
  const { s, q, channel, sel } = await searchParams;
  const { supabase, centerId: cid, userId } = await requireCenter();

  let listQuery = supabase
    .from("inquiries")
    .select("id, requester_name, contact, channel, subject, body, status, created_at")
    .eq("center_id", cid)
    .eq("kind", "post")
    .order("created_at", { ascending: false });
  if (s && ["접수", "처리중", "완료"].includes(s)) listQuery = listQuery.eq("status", s);
  if (channel) listQuery = listQuery.eq("channel", channel);
  const qSafe = safeIlike(q);
  if (qSafe) {
    listQuery = listQuery.or(
      `subject.ilike.%${qSafe}%,requester_name.ilike.%${qSafe}%,body.ilike.%${qSafe}%`,
    );
  }

  const [listRes, allRes, readsRes] = await Promise.all([
    listQuery,
    supabase.from("inquiries").select("status").eq("center_id", cid).eq("kind", "post"),
    supabase.from("inquiry_reads").select("inquiry_id, last_read_at").eq("user_id", userId),
  ]);

  const list = (listRes.data ?? []) as {
    id: string;
    requester_name: string | null;
    contact: string | null;
    channel: string;
    subject: string;
    body: string | null;
    status: string;
    created_at: string;
  }[];
  const all = (allRes.data ?? []) as { status: string }[];
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map((r) => [r.inquiry_id, r.last_read_at]),
  );

  // 각 inquiry 의 마지막 메시지 (라벨용)
  const lastMessageByInquiry: Record<string, { sender: string; created_at: string }> = {};
  if (list.length > 0) {
    const ids = list.map((i) => i.id);
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("inquiry_id, sender, created_at")
      .eq("center_id", cid)
      .in("inquiry_id", ids)
      .order("created_at", { ascending: false });
    for (const m of (msgs ?? []) as { inquiry_id: string; sender: string; created_at: string }[]) {
      if (!lastMessageByInquiry[m.inquiry_id])
        lastMessageByInquiry[m.inquiry_id] = { sender: m.sender, created_at: m.created_at };
    }
  }

  const selectedId = sel ?? null;
  const selected = selectedId ? list.find((i) => i.id === selectedId) ?? null : null;

  // 진입 시 자동 mark_read
  if (selectedId && selected) {
    await supabase
      .from("inquiry_reads")
      .upsert(
        { inquiry_id: selectedId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "inquiry_id,user_id" },
      );
  }

  // 선택된 inquiry 메시지 + 첨부
  type RawAtt = { id: string; storage_path: string; file_name: string; mime_type: string | null; size_bytes: number | null };
  type RawMsg = { id: string; sender: string; body: string; created_at: string; support_message_attachments: RawAtt[] | null };
  let messages: {
    id: string;
    sender: string;
    body: string;
    created_at: string;
    attachments: { id: string; fileName: string; mimeType: string | null; sizeBytes: number | null; url: string }[];
  }[] = [];
  if (selected) {
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id, sender, body, created_at, support_message_attachments(id, storage_path, file_name, mime_type, size_bytes)")
      .eq("inquiry_id", selected.id)
      .order("created_at", { ascending: true })
      .limit(500);
    const rawMessages = (msgs ?? []) as unknown as RawMsg[];
    const paths = rawMessages.flatMap((m) => (m.support_message_attachments ?? []).map((a) => a.storage_path));
    const urlMap = new Map<string, string>();
    if (paths.length > 0) {
      const { data: signed } = await supabase.storage.from("chat-attachments").createSignedUrls(paths, 3600);
      for (const sg of (signed ?? []) as { path: string | null; signedUrl: string }[]) {
        if (sg.path && sg.signedUrl) urlMap.set(sg.path, sg.signedUrl);
      }
    }
    messages = rawMessages.map((m) => ({
      id: m.id,
      sender: m.sender,
      body: m.body,
      created_at: m.created_at,
      attachments: (m.support_message_attachments ?? []).map((a) => ({
        id: a.id,
        fileName: a.file_name,
        mimeType: a.mime_type,
        sizeBytes: a.size_bytes,
        url: urlMap.get(a.storage_path) ?? "",
      })),
    }));
  }

  const cnt = (x: string) => all.filter((i) => i.status === x).length;
  const hasFilter = !!(q || s || channel);
  const qsTail = `${s ? `&s=${s}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}${channel ? `&channel=${channel}` : ""}`;

  return (
    <>
      {selected && <RefreshOnce k={selected.id} />}
      <div className="page-head">
        <div>
          <h1>문의 게시글</h1>
          <p className="subtext">학부모·학생이 게시한 정식 문의 — 제목·내용·답변 스레드</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 게시글</span><strong>{all.length}</strong></div>
        <div className="summary-card"><span>접수</span><strong>{cnt("접수")}</strong></div>
        <div className="summary-card"><span>처리중</span><strong>{cnt("처리중")}</strong></div>
        <div className="summary-card"><span>완료</span><strong>{cnt("완료")}</strong></div>
        <div className="summary-card"><span>처리율</span><strong>
          {all.length ? Math.round((cnt("완료") / all.length) * 100) : 0}%
        </strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel elevated" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 320px)", minHeight: 520, overflow: "hidden" }}>
          <div className="panel-head">
            <p className="panel-title">
              게시글 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}건 / 전체 ${all.length}` : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="s"
                current={s}
                options={[
                  { value: "접수", label: "접수" },
                  { value: "처리중", label: "처리중" },
                  { value: "완료", label: "완료" },
                ]}
              />
              <FilterSelect
                param="channel"
                current={channel}
                placeholder="채널 전체"
                ariaLabel="채널 필터"
                options={[
                  { value: "앱", label: "앱" },
                  { value: "웹", label: "웹" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="제목·요청자·내용 검색" />
              {hasFilter && (
                <Link className="btn" href={BASE}>
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>제목</th>
                  <th>요청자</th>
                  <th>채널</th>
                  <th style={{ width: 90 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const lm = lastMessageByInquiry[i.id];
                  const lastRead = readMap.get(i.id);
                  const isUnread = !!lm && lm.sender === "customer" && (!lastRead || lastRead < lm.created_at);
                  const isSel = i.id === selectedId;
                  return (
                    <tr key={i.id} className={`row-link-host ${isSel ? "selected" : ""}`}>
                      <td>
                        <Link
                          href={`${BASE}?sel=${i.id}${qsTail}`}
                          className="row-link-stretch"
                          style={{ fontWeight: isUnread ? 900 : 700, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                          {isUnread && (
                            <span aria-label="새 메시지" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#e53935", flexShrink: 0 }} />
                          )}
                          {i.subject}
                        </Link>
                        <div className="muted">{i.created_at.slice(0, 10)}</div>
                      </td>
                      <td className="muted">{i.requester_name ?? "-"}</td>
                      <td className="muted">{i.channel}</td>
                      <td>
                        <span className={`badge ${SB[i.status] ?? "gray"}`}>{i.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        {hasFilter ? (
                          <>
                            <strong>검색 결과가 없습니다</strong>
                            <p>필터·검색어를 조정해 보세요.</p>
                          </>
                        ) : (
                          <>
                            <strong>게시글 문의가 없습니다</strong>
                            <p>학부모·학생 앱 또는 웹에서 들어온 게시글이 여기 표시됩니다.</p>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel chat-panel" style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 320px)", minHeight: 520 }}>
          <div className="panel-head">
            <p className="panel-title">
              {selected ? selected.subject : "게시글을 선택해 주세요"}
              {selected && <span className={`badge ${SB[selected.status] ?? "gray"}`} style={{ marginLeft: 8 }}>{selected.status}</span>}
            </p>
          </div>
          {!selected ? (
            <div className="panel-body">
              <div className="empty-state">
                <strong>왼쪽에서 게시글을 선택하세요</strong>
                <p>게시글을 선택하면 본문·답변 스레드·상태 처리를 진행할 수 있습니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-thread" style={{ flex: 1, minHeight: 0 }}>
                <div style={{ background: "#fff", border: "1px solid var(--line)", borderRadius: 8, padding: 14, marginBottom: 8 }}>
                  <div style={{ display: "flex", gap: 8, fontSize: 11, color: "#6f7d78", marginBottom: 8 }}>
                    <span>{selected.requester_name ?? "익명"}</span>
                    {selected.contact && <span>· {selected.contact}</span>}
                    <span>· {selected.created_at.slice(0, 10)}</span>
                  </div>
                  {selected.body && (
                    <p style={{ margin: 0, whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.6, color: "#374151" }}>
                      {selected.body}
                    </p>
                  )}
                </div>
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <strong>아직 답변이 없습니다</strong>
                    <p>아래 입력창에 답변을 남기세요.</p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <ChatBubble
                      key={m.id}
                      side={m.sender === "admin" ? "me" : "them"}
                      label={m.sender === "admin" ? undefined : selected.requester_name ?? "요청자"}
                      time={formatChatTime(m.created_at)}
                      body={m.body}
                      attachments={m.attachments}
                    />
                  ))
                )}
                <ChatScrollAnchor k={`${selected.id}-${messages.length}-${messages[messages.length - 1]?.id ?? ""}`} />
              </div>
              <div style={{ borderTop: "1px solid var(--line)", padding: "10px 12px", flexShrink: 0 }}>
                <p className="detail-title" style={{ marginTop: 0, marginBottom: 8, fontSize: 12 }}>상태 처리</p>
                <div className="action-grid" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
                  {["접수", "처리중", "완료"].map((x) => (
                    <form key={x} action={setInquiryStatus.bind(null, selected.id, x)}>
                      <input type="hidden" name="back" value={`${BASE}?sel=${selected.id}`} />
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
                      message={`'${selected.subject}' 게시글을 삭제할까요? 답변 이력도 함께 사라집니다.`}
                      className="btn danger"
                      style={{ width: "100%" }}
                      type="submit"
                    >
                      삭제
                    </ConfirmButton>
                  </form>
                </div>
              </div>
              <form
                action={replyMessage.bind(null, selected.id)}
                data-no-loading="true"
                className="chat-input-form"
              >
                <ChatComposer placeholder="답변 입력 (Enter = 전송, Shift+Enter = 줄바꿈)" />
                <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>전송</button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
