import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import {
  replyMessage,
  setInquiryStatus,
  deleteInquiry,
} from "../actions";
import ConfirmButton from "../../ConfirmButton";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import SearchInput from "../../SearchInput";

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
  searchParams: Promise<{ sel?: string; s?: string; q?: string }>;
}) {
  const { sel, s, q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("inquiries")
    .select(
      "id, requester_name, contact, channel, subject, status, created_at",
    )
    .eq("center_id", cid)
    .eq("kind", "chat")
    .order("created_at", { ascending: false });
  if (s && ["접수", "처리중", "완료"].includes(s))
    listQuery = listQuery.eq("status", s);
  const qSafe = safeIlike(q);
  if (qSafe) {
    listQuery = listQuery.ilike("requester_name", `%${qSafe}%`);
  }

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase
      .from("inquiries")
      .select("status")
      .eq("center_id", cid)
      .eq("kind", "chat"),
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

  // 채팅 행마다 마지막 메시지 1건 (목록 미리보기용)
  const lastMessageByInquiry: Record<
    string,
    { sender: string; body: string; created_at: string }
  > = {};
  if (list.length > 0) {
    const ids = list.map((i) => i.id);
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("inquiry_id, sender, body, created_at")
      .eq("center_id", cid)
      .in("inquiry_id", ids)
      .order("created_at", { ascending: false });
    for (const m of (msgs ?? []) as {
      inquiry_id: string;
      sender: string;
      body: string;
      created_at: string;
    }[]) {
      if (!lastMessageByInquiry[m.inquiry_id])
        lastMessageByInquiry[m.inquiry_id] = {
          sender: m.sender,
          body: m.body,
          created_at: m.created_at,
        };
    }
  }

  const selected = sel
    ? (await supabase
        .from("inquiries")
        .select(
          "id, requester_name, contact, channel, subject, status, created_at",
        )
        .eq("center_id", cid)
        .eq("kind", "chat")
        .eq("id", sel)
        .maybeSingle()).data ?? null
    : null;
  let messages: { id: string; sender: string; body: string; created_at: string }[] =
    [];
  if (selected) {
    const { data: msgs } = await supabase
      .from("support_messages")
      .select("id, sender, body, created_at")
      .eq("center_id", cid)
      .eq("inquiry_id", selected.id)
      .order("created_at", { ascending: true });
    messages = msgs ?? [];
  }

  const cnt = (x: string) => all.filter((i) => i.status === x).length;
  const hasFilter = !!(q || s);

  const rowHref = (id: string) => {
    const qs = new URLSearchParams();
    qs.set("sel", id);
    if (s) qs.set("s", s);
    if (q) qs.set("q", q);
    return `${BASE}?${qs}`;
  };
  const resetHref = sel ? `${BASE}?sel=${sel}` : BASE;
  const backHref = (id?: string) =>
    id
      ? `${BASE}?${new URLSearchParams({ sel: id, ...(s ? { s } : {}), ...(q ? { q } : {}) })}`
      : BASE;

  return (
    <>
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

      <div className="grid account-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              채팅 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${all.length}`
                  : `${list.length}건`}
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
                <Link className="btn" href={resetHref}>
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <div className="list-scroll">
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
                return (
                  <tr
                    key={i.id}
                    className={`row-link-host ${i.id === sel ? "selected" : ""}`}
                  >
                    <td>
                      <Link
                        href={rowHref(i.id)}
                        className="row-link-stretch"
                        style={{ fontWeight: 900, color: "var(--text)" }}
                      >
                        {i.requester_name ?? "익명"}
                      </Link>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {i.contact ?? ""}
                      </div>
                    </td>
                    <td className="muted">
                      <div
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          maxWidth: 260,
                        }}
                      >
                        {lm?.sender === "admin" ? "나: " : ""}
                        {preview}
                      </div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {fmtTime(tstamp)}
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${SB[i.status] ?? "gray"}`}>
                        {i.status}
                      </span>
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

        <div className="panel">
          {!selected ? (
            <>
              <div className="panel-head">
                <p className="panel-title">대화창</p>
              </div>
              <div className="panel-body">
                <div className="empty-state">
                  <strong>채팅을 선택하세요</strong>
                  <p>좌측에서 채팅을 선택하면 대화·상태 처리를 진행할 수 있습니다.</p>
                </div>
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
                <span className={`badge ${SB[selected.status] ?? "gray"}`}>
                  {selected.status}
                </span>
              </div>
              <div className="panel-body">
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <div className="message-list">
                    {messages.length === 0 && (
                      <div className="muted">아직 메시지가 없습니다.</div>
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
                    <input type="hidden" name="back" value={backHref(selected.id)} />
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
                      <form
                        key={x}
                        action={setInquiryStatus.bind(null, selected.id, x)}
                      >
                        <input
                          type="hidden"
                          name="back"
                          value={backHref(selected.id)}
                        />
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
                      <input type="hidden" name="back" value={backHref()} />
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
      </div>
    </>
  );
}
