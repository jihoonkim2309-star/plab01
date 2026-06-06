import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { safeIlike } from "@/lib/db-search";
import FilterBar from "../../FilterBar";
import StatusChips from "../../StatusChips";
import FilterSelect from "../../FilterSelect";
import SearchInput from "../../SearchInput";
import { PostDrawerProvider } from "./PostDrawerContext";
import PostRowLink from "./PostRowLink";
import PostDetailPanel from "./PostDetailPanel";

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
    s?: string;
    q?: string;
    channel?: string;
  }>;
}) {
  const { s, q, channel } = await searchParams;
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

  const cnt = (x: string) => all.filter((i) => i.status === x).length;
  const hasFilter = !!(q || s || channel);

  return (
    <PostDrawerProvider>
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

      <div className="chats-layout">
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
                  { value: "앱", label: "앱" },
                  { value: "웹", label: "웹" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput
                param="q"
                current={q}
                placeholder="제목·요청자·내용 검색"
              />
              {hasFilter && (
                <Link className="btn" href={BASE}>
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <div className="list-scroll">
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
                  <tr key={i.id} className="row-link-host">
                    <td>
                      <PostRowLink
                        postId={i.id}
                        href={`${BASE}?sel=${i.id}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 900, color: "var(--text)" }}
                      >
                        {i.subject}
                      </PostRowLink>
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
        </div>

        <PostDetailPanel />
      </div>
    </PostDrawerProvider>
  );
}
