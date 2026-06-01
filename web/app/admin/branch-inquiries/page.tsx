import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ConfirmButton from "../ConfirmButton";
import {
  createBranchInquiry,
  replyBranchInquiry,
  closeBranchInquiry,
  reopenBranchInquiry,
} from "./actions";

const STATUS_BADGE: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};

export default async function BranchInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; status?: string; q?: string }>;
}) {
  const { id, status, q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const [listRes, selectedRes, messagesRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, subject, status, created_at, updated_at")
      .eq("center_id", cid)
      .eq("kind", "branch_to_hq")
      .order("updated_at", { ascending: false })
      .limit(200),
    id
      ? supabase
          .from("inquiries")
          .select("id, subject, body, status, created_at")
          .eq("center_id", cid)
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
  ]);

  type Row = {
    id: string;
    subject: string;
    status: string;
    created_at: string;
    updated_at: string;
  };
  const allList = (listRes.data ?? []) as unknown as Row[];
  const needle = q?.toLowerCase() ?? "";
  const list = allList.filter((i) => {
    if (status && i.status !== status) return false;
    if (needle && !i.subject.toLowerCase().includes(needle)) return false;
    return true;
  });
  const totals = {
    total: allList.length,
    open: allList.filter((i) => i.status !== "완료").length,
    done: allList.filter((i) => i.status === "완료").length,
  };
  const selected = selectedRes.data as
    | { id: string; subject: string; body: string; status: string; created_at: string }
    | null;
  const messages = (messagesRes.data ?? []) as unknown as {
    id: string;
    sender: string;
    body: string;
    created_at: string;
  }[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>본사에 문의</h1>
          <p className="subtext">본사 (super_admin) 에게 보내는 1:1 문의 — 답변은 본사가 작성</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/branch-inquiries?id=new">
            새 문의 작성
          </Link>
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
            <p className="panel-title">목록</p>
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
              <SearchInput param="q" current={q} placeholder="제목 검색" />
            </FilterBar>
          </div>
          <div>
            <table>
              <thead>
                <tr>
                  <th>제목</th>
                  <th style={{ width: 90 }}>상태</th>
                  <th style={{ width: 130 }}>최근 활동</th>
                </tr>
              </thead>
              <tbody>
                {list.map((i) => (
                  <tr
                    key={i.id}
                    className={`row-link-host ${i.id === id ? "selected" : ""}`}
                  >
                    <td>
                      <Link
                        href={`/admin/branch-inquiries?id=${i.id}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 700, color: "var(--text)" }}
                      >
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
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={3}>
                      <div className="empty-state">
                        <strong>본사 문의가 없습니다</strong>
                        <p>[새 문의 작성] 으로 시작하세요.</p>
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
              {id === "new" ? "새 본사 문의" : selected ? selected.subject : "문의 상세"}
            </p>
          </div>
          <div className="panel-body">
            {id === "new" ? (
              <form action={createBranchInquiry}>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>제목 *</label>
                  <input name="subject" required maxLength={120} placeholder="예: 본사 결제 시스템 문의" />
                </div>
                <div className="field" style={{ marginBottom: 12 }}>
                  <label>본문 *</label>
                  <textarea name="body" rows={6} required placeholder="문의 내용을 입력하세요" />
                </div>
                <div className="detail-actions">
                  <button type="submit" className="btn primary">문의 보내기</button>
                </div>
              </form>
            ) : selected ? (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">
                    상태{" "}
                    <span className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}>
                      {selected.status}
                    </span>
                  </p>
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
                    <p className="detail-title">답글 작성</p>
                    <form action={replyBranchInquiry}>
                      <input type="hidden" name="inquiry_id" value={selected.id} />
                      <input type="hidden" name="sender_role" value="admin" />
                      <textarea name="body" rows={3} required placeholder="답글 내용" />
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
            ) : (
              <div className="empty-state">
                <strong>선택된 문의가 없습니다</strong>
                <p>왼쪽 목록에서 선택하거나 [새 문의 작성] 을 누르세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
