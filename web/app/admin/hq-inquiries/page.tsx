import Link from "next/link";
import { requireSuperAdmin } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ConfirmButton from "../ConfirmButton";
import RefreshOnce from "../RefreshOnce";
import {
  replyBranchInquiry,
  closeBranchInquiry,
  reopenBranchInquiry,
} from "../branch-inquiries/actions";

const STATUS_BADGE: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};

export default async function HqInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; status?: string; q?: string }>;
}) {
  const { id, status, q } = await searchParams;
  const { supabase, userId } = await requireSuperAdmin();

  // 상세 진입 시 멱등 mark_read
  if (id) {
    await supabase
      .from("inquiry_reads")
      .upsert(
        { inquiry_id: id, user_id: userId, last_read_at: new Date().toISOString() },
        { onConflict: "inquiry_id,user_id" },
      );
  }

  const [listRes, selectedRes, messagesRes, readsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, subject, status, center_id, centers(name), created_at, updated_at")
      .eq("kind", "branch_to_hq")
      .order("updated_at", { ascending: false })
      .limit(200),
    id
      ? supabase
          .from("inquiries")
          .select(
            "id, subject, body, status, center_id, centers(name), created_at",
          )
          .eq("kind", "branch_to_hq")
          .eq("id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    id
      ? supabase
          .from("support_messages")
          .select("id, sender, body, created_at")
          .eq("inquiry_id", id)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
    supabase
      .from("inquiry_reads")
      .select("inquiry_id, last_read_at")
      .eq("user_id", userId),
  ]);

  type Row = {
    id: string;
    subject: string;
    status: string;
    center_id: string;
    centers: { name: string } | null;
    created_at: string;
    updated_at: string;
  };
  const allList = (listRes.data ?? []) as unknown as Row[];
  const needle = q?.toLowerCase() ?? "";
  const list = allList.filter((i) => {
    if (status && i.status !== status) return false;
    if (
      needle &&
      !i.subject.toLowerCase().includes(needle) &&
      !(i.centers?.name?.toLowerCase().includes(needle) ?? false)
    )
      return false;
    return true;
  });
  const totals = {
    total: allList.length,
    open: allList.filter((i) => i.status !== "완료").length,
    done: allList.filter((i) => i.status === "완료").length,
  };
  const selected = selectedRes.data as
    | (Row & { body: string })
    | null;
  const messages = (messagesRes.data ?? []) as unknown as {
    id: string;
    sender: string;
    body: string;
    created_at: string;
  }[];
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  return (
    <>
      {id && <RefreshOnce k={id} />}
      <div className="page-head">
        <div>
          <h1>지점 문의</h1>
          <p className="subtext">지점들이 본사에 보낸 1:1 문의 — 본사가 답변</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>진행 중</span><strong>{totals.open}</strong></div>
        <div className="summary-card"><span>완료</span><strong>{totals.done}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">받은 문의</p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "접수", label: "접수" },
                  { value: "처리중", label: "처리중" },
                  { value: "완료", label: "완료" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="제목·지점 검색" />
            </FilterBar>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>지점</th>
                  <th>제목</th>
                  <th style={{ width: 80 }}>상태</th>
                  <th style={{ width: 130 }}>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => {
                  const lastRead = readMap.get(i.id);
                  const isUnread = !lastRead || lastRead < i.updated_at;
                  return (
                    <tr
                      key={i.id}
                      className={`row-link-host ${i.id === id ? "selected" : ""}`}
                    >
                      <td className="muted">{i.centers?.name ?? "-"}</td>
                      <td>
                        <Link
                          href={`/admin/hq-inquiries?id=${i.id}`}
                          className="row-link-stretch"
                          style={{
                            fontWeight: isUnread ? 800 : 600,
                            color: isUnread ? "var(--text)" : "#6f7d78",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          {isUnread && (
                            <span
                              aria-label="새 메시지"
                              style={{
                                display: "inline-block",
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                background: "#e53935",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          {i.subject}
                        </Link>
                      </td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[i.status] ?? "gray"}`}>
                          {i.status}
                        </span>
                      </td>
                      <td className="muted" style={{ fontSize: 12 }}>
                        {i.updated_at.slice(0, 16).replace("T", " ")}
                      </td>
                    </tr>
                  );
                })}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <strong>받은 지점 문의가 없습니다</strong>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              {selected ? selected.subject : "문의 상세"}
            </p>
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 문의가 없습니다</strong>
                <p>왼쪽 목록에서 문의를 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <div className="info-list">
                    <div className="info-row">
                      <span>지점</span>
                      <strong>{selected.centers?.name ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>상태</span>
                      <strong>
                        <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
                          {selected.status}
                        </span>
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">대화 ({messages.length})</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {messages.map((m) => {
                      const isHq = m.sender === "hq";
                      return (
                        <div
                          key={m.id}
                          style={{
                            padding: 10,
                            borderRadius: 8,
                            background: isHq ? "var(--blue-soft)" : "var(--bg)",
                            border: `1px solid ${isHq ? "#b8d0ee" : "var(--line)"}`,
                            alignSelf: isHq ? "flex-start" : "flex-end",
                            maxWidth: "85%",
                          }}
                        >
                          <div
                            className="muted"
                            style={{ fontSize: 11, marginBottom: 4 }}
                          >
                            {isHq ? "본사" : "지점"} · {m.created_at.slice(0, 16).replace("T", " ")}
                          </div>
                          <div style={{ whiteSpace: "pre-wrap", fontSize: 13 }}>
                            {m.body}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {selected.status !== "완료" && (
                  <div className="detail-block">
                    <p className="detail-title">본사 답변</p>
                    <form action={replyBranchInquiry}>
                      <input type="hidden" name="inquiry_id" value={selected.id} />
                      <input type="hidden" name="sender_role" value="hq" />
                      <textarea name="body" rows={3} required placeholder="본사 답변" />
                      <div className="detail-actions" style={{ marginTop: 8 }}>
                        <button type="submit" className="btn primary">전송</button>
                      </div>
                    </form>
                  </div>
                )}

                <div className="detail-block">
                  {selected.status === "완료" ? (
                    <form action={reopenBranchInquiry}>
                      <input type="hidden" name="inquiry_id" value={selected.id} />
                      <button type="submit" className="btn" style={{ width: "100%" }}>
                        재오픈
                      </button>
                    </form>
                  ) : (
                    <form action={closeBranchInquiry}>
                      <input type="hidden" name="inquiry_id" value={selected.id} />
                      <ConfirmButton
                        message="이 문의를 완료 처리할까요?"
                        className="btn"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        완료 처리
                      </ConfirmButton>
                    </form>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
