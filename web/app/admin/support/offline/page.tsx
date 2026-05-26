import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import {
  createOfflineInquiry,
  replyMessage,
  setInquiryStatus,
  deleteInquiry,
} from "../actions";
import ConfirmButton from "../../ConfirmButton";
import PhoneInput from "../../PhoneInput";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";

const SB: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};
const CB: Record<string, string> = {
  전화: "blue",
  방문: "orange",
};
const BASE = "/admin/support/offline";

export default async function SupportOfflinePage({
  searchParams,
}: {
  searchParams: Promise<{
    sel?: string;
    s?: string;
    q?: string;
    channel?: string;
    error?: string;
  }>;
}) {
  const { sel, s, q, channel, error } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("inquiries")
    .select(
      "id, requester_name, contact, channel, subject, body, status, created_at",
    )
    .eq("center_id", cid)
    .eq("kind", "offline")
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
      .select("status, channel")
      .eq("center_id", cid)
      .eq("kind", "offline"),
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
  const all = (allRes.data ?? []) as { status: string; channel: string }[];

  const selected = sel
    ? (await supabase
        .from("inquiries")
        .select(
          "id, requester_name, contact, channel, subject, body, status, created_at",
        )
        .eq("center_id", cid)
        .eq("kind", "offline")
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
  const chCnt = (x: string) => all.filter((i) => i.channel === x).length;
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
  const newRecordHref = `${BASE}?${new URLSearchParams({ ...(s ? { s } : {}), ...(channel ? { channel } : {}), ...(q ? { q } : {}) })}`;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>전화·방문 기록</h1>
          <p className="subtext">전화·방문으로 들어온 문의를 어드민이 직접 기록 — 학부모/학생 포털과 무관, 내부 이력 보존용</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 기록</span><strong>{all.length}</strong></div>
        <div className="summary-card"><span>전화</span><strong>{chCnt("전화")}</strong></div>
        <div className="summary-card"><span>방문</span><strong>{chCnt("방문")}</strong></div>
        <div className="summary-card"><span>접수</span><strong>{cnt("접수")}</strong></div>
        <div className="summary-card"><span>처리중</span><strong>{cnt("처리중")}</strong></div>
        <div className="summary-card"><span>완료</span><strong>{cnt("완료")}</strong></div>
      </div>

      <div className="grid account-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              기록 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${all.length}`
                  : `${list.length}건`}
              </span>
            </p>
            <div className="toolbar">
              {sel ? (
                <Link className="btn primary" href={newRecordHref}>
                  + 새 기록
                </Link>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>
                  우측에서 새 기록을 입력하세요
                </span>
              )}
            </div>
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
                  { value: "전화", label: "전화" },
                  { value: "방문", label: "방문" },
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
                  <td className="muted">
                    {i.requester_name ?? "-"}
                    {i.contact && (
                      <div style={{ fontSize: 11 }}>{i.contact}</div>
                    )}
                  </td>
                  <td>
                    <span className={`badge ${CB[i.channel] ?? "gray"}`}>
                      {i.channel}
                    </span>
                  </td>
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
                          <strong>기록이 없습니다</strong>
                          <p>우측 폼에서 전화·방문 문의를 직접 기록할 수 있습니다.</p>
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
                <p className="panel-title">새 기록 등록</p>
              </div>
              <form action={createOfflineInquiry} className="panel-body">
                {error === "subject" && (
                  <div
                    style={{
                      background: "var(--red-soft, #fdecec)",
                      borderColor: "#f3b1b1",
                      color: "var(--red)",
                      padding: "10px 12px",
                      borderRadius: 8,
                      marginBottom: 12,
                      fontSize: 13,
                    }}
                  >
                    제목은 필수입니다.
                  </div>
                )}
                <div className="field">
                  <label>제목 *</label>
                  <input name="subject" required placeholder="예: 입회 상담 전화" />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>채널 *</label>
                  <select name="channel" defaultValue="전화" required>
                    <option value="전화">전화</option>
                    <option value="방문">방문</option>
                  </select>
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>요청자 이름</label>
                  <input
                    name="requester_name"
                    placeholder="학부모/문의자 이름"
                  />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>연락처</label>
                  <PhoneInput name="contact" />
                </div>
                <div className="field" style={{ marginTop: 12 }}>
                  <label>내용</label>
                  <textarea
                    name="body"
                    rows={5}
                    placeholder="문의 내용·통화 요약·후속조치 메모"
                  />
                </div>
                <div className="detail-actions">
                  <button className="btn primary" type="submit">
                    기록 저장
                  </button>
                </div>
              </form>
            </>
          ) : (
            <>
              <div className="panel-head">
                <p className="panel-title">
                  <span
                    className={`badge ${CB[selected.channel] ?? "gray"}`}
                    style={{ marginRight: 8 }}
                  >
                    {selected.channel}
                  </span>
                  {selected.subject}
                </p>
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
                      <span>접수일</span>
                      <strong>{selected.created_at.slice(0, 10)}</strong>
                    </div>
                  </div>
                  {selected.body && (
                    <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                      {selected.body}
                    </div>
                  )}
                </div>

                <div className="detail-block">
                  <p className="detail-title">후속 메모</p>
                  <div className="message-list">
                    {messages.length === 0 && (
                      <div className="muted">아직 후속 메모가 없습니다.</div>
                    )}
                    {messages.map((m) => (
                      <div key={m.id} className="msg me">
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
                      placeholder="후속 조치·통화 결과 메모..."
                      style={{
                        flex: 1,
                        border: "1px solid var(--line-strong)",
                        borderRadius: 8,
                        padding: "9px 10px",
                      }}
                    />
                    <button className="btn primary">추가</button>
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
                        message={`'${selected.subject}' 기록을 삭제할까요? 후속 메모도 함께 사라집니다.`}
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
