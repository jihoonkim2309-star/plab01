import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ConfirmButton from "../ConfirmButton";
import AnnouncementForm from "./AnnouncementForm";
import { publishAnnouncement, deleteAnnouncement } from "./actions";

const SCOPE_LABEL: Record<string, string> = {
  all: "전체",
  class: "클래스",
  students: "학생 지정",
};
const AUDIENCE_LABEL: Record<string, string> = {
  parent_only: "학부모만",
  student_only: "학생만",
  parent_student: "학부모·학생",
};

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    id?: string;
    status?: string;
    q?: string;
    published?: string;
  }>;
}) {
  const { id, status, q, published } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  const [listRes, selectedRes, classesRes, studentsRes] = await Promise.all([
    supabase
      .from("announcements")
      .select("id, title, scope, audience, published_at, notified_count, created_at")
      .eq("center_id", cid)
      .order("created_at", { ascending: false })
      .limit(200),
    id
      ? supabase
          .from("announcements")
          .select(
            "id, title, body, scope, audience, target_class_ids, target_student_ids, published_at, notified_count, created_at",
          )
          .eq("center_id", cid)
          .eq("id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("classes")
      .select("id, name")
      .eq("center_id", cid)
      .in("status", ["운영", "모집중"])
      .order("name"),
    supabase
      .from("students")
      .select("id, name, class_name")
      .eq("center_id", cid)
      .in("status", ["정상", "상담중"])
      .order("name"),
  ]);

  type Row = {
    id: string;
    title: string;
    scope: string;
    audience: string;
    published_at: string | null;
    notified_count: number;
    created_at: string;
  };
  const allList = (listRes.data ?? []) as unknown as Row[];

  const needle = q?.toLowerCase() ?? "";
  const list = allList.filter((a) => {
    const isPublished = !!a.published_at;
    if (status === "draft" && isPublished) return false;
    if (status === "published" && !isPublished) return false;
    if (needle && !a.title.toLowerCase().includes(needle)) return false;
    return true;
  });
  const totals = {
    total: allList.length,
    draft: allList.filter((a) => !a.published_at).length,
    pub: allList.filter((a) => !!a.published_at).length,
  };

  const selected = selectedRes.data as
    | (Row & { body: string; target_class_ids: string[] | null; target_student_ids: string[] | null })
    | null;

  const classes = (classesRes.data ?? []) as { id: string; name: string }[];
  const students = (studentsRes.data ?? []) as {
    id: string;
    name: string;
    class_name: string | null;
  }[];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>공지사항</h1>
          <p className="subtext">학부모·학생에게 보내는 공지 작성·발행</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/announcements?id=new">
            새 공지 작성
          </Link>
        </div>
      </div>

      {published && (
        <div
          className="panel"
          style={{
            background: "var(--green-soft)",
            borderColor: "#b8dccb",
            color: "var(--green)",
            padding: "12px 16px",
          }}
        >
          공지 발행 완료 — 알림 {published}건 큐잉되었습니다 (FCM/알림톡 라이브 시 자동 전송).
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>작성 중 (draft)</span><strong>{totals.draft}</strong></div>
        <div className="summary-card"><span>발행 완료</span><strong>{totals.pub}</strong></div>
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
                  { value: "draft", label: "작성 중" },
                  { value: "published", label: "발행 완료" },
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
                  <th>대상</th>
                  <th>수신</th>
                  <th>상태</th>
                </tr>
              </thead>
              <tbody>
                {list.map((a) => (
                  <tr
                    key={a.id}
                    className={`row-link-host ${a.id === id ? "selected" : ""}`}
                  >
                    <td>
                      <Link
                        href={`/admin/announcements?id=${a.id}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 700, color: "var(--text)" }}
                      >
                        {a.title}
                      </Link>
                    </td>
                    <td className="muted">{SCOPE_LABEL[a.scope] ?? a.scope}</td>
                    <td className="muted">{AUDIENCE_LABEL[a.audience] ?? a.audience}</td>
                    <td>
                      {a.published_at ? (
                        <span className="badge green">발행 {a.notified_count}건</span>
                      ) : (
                        <span className="badge gray">작성 중</span>
                      )}
                    </td>
                  </tr>
                ))}
                {list.length === 0 && (
                  <tr>
                    <td colSpan={4}>
                      <div className="empty-state">
                        <strong>공지가 없습니다</strong>
                        <p>우측 상단 [새 공지 작성] 으로 시작하세요.</p>
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
              {id === "new" ? "새 공지 작성" : selected ? selected.title : "공지 상세"}
            </p>
          </div>
          <div className="panel-body">
            {id === "new" ? (
              <AnnouncementForm classes={classes} students={students} />
            ) : selected ? (
              selected.published_at ? (
                <>
                  <div className="detail-block" style={{ marginTop: 0 }}>
                    <p className="detail-title">발행 정보</p>
                    <div className="info-list">
                      <div className="info-row">
                        <span>발행일시</span>
                        <strong>{selected.published_at.slice(0, 16).replace("T", " ")}</strong>
                      </div>
                      <div className="info-row">
                        <span>대상</span>
                        <strong>{SCOPE_LABEL[selected.scope]}</strong>
                      </div>
                      <div className="info-row">
                        <span>수신</span>
                        <strong>{AUDIENCE_LABEL[selected.audience]}</strong>
                      </div>
                      <div className="info-row">
                        <span>큐잉된 알림</span>
                        <strong>{selected.notified_count}건</strong>
                      </div>
                    </div>
                  </div>
                  <div className="detail-block">
                    <p className="detail-title">본문</p>
                    <p style={{ whiteSpace: "pre-wrap", lineHeight: 1.6 }}>{selected.body}</p>
                  </div>
                  <div className="detail-block">
                    <p className="detail-title">위험 영역</p>
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={selected.id} />
                      <ConfirmButton
                        message={`'${selected.title}' 공지를 삭제할까요? (학부모/학생 알림 큐잉 행은 그대로 유지됩니다)`}
                        className="btn danger"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        공지 삭제
                      </ConfirmButton>
                    </form>
                  </div>
                </>
              ) : (
                <>
                  <AnnouncementForm
                    classes={classes}
                    students={students}
                    initial={selected}
                  />
                  <div className="detail-block" style={{ marginTop: 16 }}>
                    <form action={publishAnnouncement}>
                      <input type="hidden" name="id" value={selected.id} />
                      <ConfirmButton
                        message={`'${selected.title}' 을 지금 발행할까요? 발행 후엔 수정 불가, 학부모/학생 알림 큐잉됩니다.`}
                        className="btn primary"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        지금 발행
                      </ConfirmButton>
                    </form>
                  </div>
                  <div className="detail-block">
                    <form action={deleteAnnouncement}>
                      <input type="hidden" name="id" value={selected.id} />
                      <ConfirmButton
                        message={`'${selected.title}' draft 를 삭제할까요?`}
                        className="btn danger"
                        type="submit"
                        style={{ width: "100%" }}
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  </div>
                </>
              )
            ) : (
              <div className="empty-state">
                <strong>선택된 공지가 없습니다</strong>
                <p>왼쪽 목록에서 공지를 선택하거나 [새 공지 작성] 을 누르세요.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
