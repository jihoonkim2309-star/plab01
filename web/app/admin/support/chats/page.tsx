import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
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
const BASE = "/admin/support/chats";

function fmtTime(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 16).replace("T", " ");
  const today = new Date();
  const sameDay =
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate();
  if (sameDay) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  }
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default async function SupportChatsPage({
  searchParams,
}: {
  searchParams: Promise<{ s?: string; q?: string; sel?: string }>;
}) {
  const { s, q, sel } = await searchParams;
  const { supabase, centerId: cid, userId } = await requireCenter();

  let listQuery = supabase
    .from("inquiries")
    .select("id, requester_name, contact, channel, subject, status, created_at")
    .eq("center_id", cid)
    .eq("kind", "chat")
    .order("created_at", { ascending: false });
  if (s && ["접수", "처리중", "완료"].includes(s)) listQuery = listQuery.eq("status", s);
  const qSafe = safeIlike(q);
  if (qSafe) listQuery = listQuery.ilike("requester_name", `%${qSafe}%`);

  const [listRes, allRes, readsRes] = await Promise.all([
    listQuery,
    supabase.from("inquiries").select("status").eq("center_id", cid).eq("kind", "chat"),
    supabase.from("inquiry_reads").select("inquiry_id, last_read_at").eq("user_id", userId),
  ]);

  const list = (listRes.data ?? []) as {
    id: string;
    requester_name: string | null;
    contact: string | null;
    channel: string;
    subject: string;
    status: string;
    created_at: string;
  }[];
  const all = (allRes.data ?? []) as { status: string }[];
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map((r) => [r.inquiry_id, r.last_read_at]),
  );

  // 각 inquiry 의 마지막 메시지
  const lastMessageByInquiry: Record<string, { sender: string; body: string; created_at: string }> = {};
  if (list.length > 0) {
    const ids = list.map((i) => i.id);
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("inquiry_id, sender, body, created_at")
      .eq("center_id", cid)
      .in("inquiry_id", ids)
      .order("created_at", { ascending: false });
    for (const m of (msgs ?? []) as { inquiry_id: string; sender: string; body: string; created_at: string }[]) {
      if (!lastMessageByInquiry[m.inquiry_id])
        lastMessageByInquiry[m.inquiry_id] = { sender: m.sender, body: m.body, created_at: m.created_at };
    }
  }

  // 선택된 inquiry
  const selectedId = sel ?? null;
  const selected = selectedId ? list.find((i) => i.id === selectedId) ?? null : null;

  // 진입 시 멱등 mark_read
  if (selectedId && selected) {
    await supabase
      .from("inquiry_reads")
      .upsert(
        { inquiry_id: selectedId, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "inquiry_id,user_id" },
      );
  }

  // 선택된 inquiry 의 메시지 + 첨부 signed URL
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
  const hasFilter = !!(q || s);

  return (
    <>
      {selected && <RefreshOnce k={selected.id} />}
      <div className="page-head">
        <div>
          <h1>1:1 채팅</h1>
          <p className="subtext">학부모·학생과의 1:1 대화 — 카톡 스타일 실시간 응대</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 채팅</span><strong>{all.length}</strong></div>
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
              채팅 목록{" "}
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
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="요청자명 검색" />
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
                  <th>요청자</th>
                  <th>최근 메시지</th>
                  <th style={{ width: 110 }}>상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const lm = lastMessageByInquiry[i.id];
                  const preview = lm?.body ?? "(아직 메시지 없음)";
                  const tstamp = lm?.created_at ?? i.created_at;
                  const lastRead = readMap.get(i.id);
                  const isUnread = !!lm && lm.sender === "customer" && (!lastRead || lastRead < lm.created_at);
                  const isSel = i.id === selectedId;
                  return (
                    <tr key={i.id} className={`row-link-host ${isSel ? "selected" : ""}`}>
                      <td>
                        <Link
                          href={`${BASE}?sel=${i.id}${s ? `&s=${s}` : ""}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                          className="row-link-stretch"
                          style={{ fontWeight: isUnread ? 900 : 700, color: "var(--text)", display: "inline-flex", alignItems: "center", gap: 8 }}
                        >
                          {isUnread && (
                            <span aria-label="새 메시지" style={{ display: "inline-block", width: 6, height: 6, borderRadius: "50%", background: "#e53935", flexShrink: 0 }} />
                          )}
                          {i.requester_name ?? "익명"}
                        </Link>
                        <div className="muted" style={{ fontSize: 11 }}>{i.contact ?? ""}</div>
                      </td>
                      <td className="muted">
                        <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                          {lm?.sender === "admin" ? "나: " : ""}
                          {preview}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>{fmtTime(tstamp)}</div>
                      </td>
                      <td>
                        <span className={`badge ${SB[i.status] ?? "gray"}`}>{i.status}</span>
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">
                        {hasFilter ? (
                          <>
                            <strong>검색 결과가 없습니다</strong>
                            <p>필터·검색어를 조정해 보세요.</p>
                          </>
                        ) : (
                          <>
                            <strong>채팅이 없습니다</strong>
                            <p>학부모·학생 앱에서 '1:1 채팅' 으로 시작된 대화가 여기 표시됩니다.</p>
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
              {selected ? (selected.requester_name ?? "익명") : "채팅을 선택해 주세요"}
              {selected && <span className={`badge ${SB[selected.status] ?? "gray"}`} style={{ marginLeft: 8 }}>{selected.status}</span>}
            </p>
          </div>
          {!selected ? (
            <div className="panel-body">
              <div className="empty-state">
                <strong>왼쪽에서 채팅을 선택하세요</strong>
                <p>채팅을 선택하면 대화·상태 처리를 진행할 수 있습니다.</p>
              </div>
            </div>
          ) : (
            <>
              <div className="chat-thread" style={{ flex: 1, minHeight: 0 }}>
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <strong>아직 메시지가 없습니다</strong>
                    <p>아래 입력창에 첫 메시지를 보내보세요.</p>
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
              <form
                action={replyMessage.bind(null, selected.id)}
                data-no-loading="true"
                className="chat-input-form"
              >
                <ChatComposer placeholder="메시지 입력 (Enter = 전송, Shift+Enter = 줄바꿈)" />
                <button type="submit" className="btn primary" style={{ alignSelf: "flex-end" }}>전송</button>
              </form>
            </>
          )}
        </div>
      </div>
    </>
  );
}
