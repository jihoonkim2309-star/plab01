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
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";

const SB: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};
const BASE = "/admin/support/posts";

export default async function SupportPostsPage({
  searchParams,
}: {
  searchParams: Promise<{
    sel?: string;
    s?: string;
    q?: string;
    channel?: string;
  }>;
}) {
  const { sel, s, q, channel } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("inquiries")
    .select(
      "id, requester_name, contact, channel, subject, body, status, created_at",
    )
    .eq("center_id", cid)
    .eq("kind", "post")
    .order("created_at", { ascending: false });
  if (s && ["접수", "처리중", "완료"].includes(s))
    listQuery = listQuery.eq("status", s);
  if (channel) listQuery = listQuery.eq("channel", channel);
  const qSafe = safeIlike(q);
  if (qSafe) {
    listQuery = listQuery.or(
      `subject.ilike.%${qSafe}%,requester_name.ilike.%${qSafe}%,body.ilike.%${qSafe}%`,
    );
  }

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase
      .from("inquiries")
      .select("status")
      .eq("center_id", cid)
      .eq("kind", "post"),
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

  const selected = sel
    ? (await supabase
        .from("inquiries")
        .select(
          "id, requester_name, contact, channel, subject, body, status, created_at",
        )
        .eq("center_id", cid)
        .eq("kind", "post")
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
  const hasFilter = !!(q || s || channel);

  const rowHref = (id: string) => {
    const qs = new URLSearchParams();
    qs.set("sel", id);
    if (s) qs.set("s", s);
    if (channel) qs.set("channel", channel);
    if (q) qs.set("q", q);
    return `${BASE}?${qs}`;
  };
  const resetHref = sel ? `${BASE}?sel=${sel}` : BASE;
  const backHref = (id?: string) =>
    id
      ? `${BASE}?${new URLSearchParams({ sel: id, ...(s ? { s } : {}), ...(channel ? { channel } : {}), ...(q ? { q } : {}) })}`
      : BASE;

  return (
    <>
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

      <div className="grid account-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              게시글 목록{" "}
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
              <FilterSelect
                param="channel"
                current={channel}
                placeholder="채널 전체"
                ariaLabel="채널 필터"
                options={[
                  { value: "웹", label: "웹" },
                  { value: "전화", label: "전화" },
                  { value: "방문", label: "방문" },
                  { value: "앱", label: "앱" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput
                param="q"
                current={q}
                placeholder="제목·요청자·내용 검색"
              />
              {hasFilter && (
                <Link className="btn" href={resetHref}>
                  초기화
                </Link>
              )}
            </FilterBar>
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
                      {i.subject}
                    </Link>
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

        <div className="panel">
          {!selected ? (
            <>
              <div className="panel-head">
                <p className="panel-title">게시글 상세</p>
              </div>
              <div className="panel-body">
                <div className="empty-state">
                  <strong>게시글을 선택하세요</strong>
                  <p>좌측에서 게시글을 선택하면 답변·상태 처리를 진행할 수 있습니다.</p>
                </div>
              </div>
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
                  <p className="detail-title">답변 스레드</p>
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
                    <input type="hidden" name="back" value={backHref(selected.id)} />
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
                        message={`'${selected.subject}' 게시글을 삭제할까요? 메시지 이력도 함께 사라집니다.`}
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
