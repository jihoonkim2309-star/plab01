import Link from "next/link";
import { requireCenter } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import FilterSelect from "../FilterSelect";
import SearchInput from "../SearchInput";

const SB: Record<string, string> = {
  대기: "orange",
  성공: "green",
  실패: "red",
};

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; kind?: string }>;
}) {
  const { q, status, kind } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("notifications")
    .select(
      "id, kind, recipient, template, status, provider, error, created_at, sent_at",
    )
    .eq("center_id", cid)
    .order("created_at", { ascending: false })
    .limit(300);
  if (status) listQuery = listQuery.eq("status", status);
  if (kind) listQuery = listQuery.eq("kind", kind);
  if (q) {
    listQuery = listQuery.or(
      `recipient.ilike.%${q}%,template.ilike.%${q}%`,
    );
  }

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase
      .from("notifications")
      .select("status, kind")
      .eq("center_id", cid)
      .order("created_at", { ascending: false })
      .limit(300),
  ]);

  const list = listRes.data ?? [];
  const all = (allRes.data ?? []) as { status: string; kind: string }[];
  const cnt = (s: string) => all.filter((n) => n.status === s).length;
  const kinds = Array.from(new Set(all.map((n) => n.kind))).filter(Boolean);
  const hasFilter = !!(q || status || kind);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>알림 발송 로그</h1>
          <p className="subtext">앱 푸시(FCM) · 카카오 알림톡(Solapi) 발송 기록 (최근 300건)</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{all.length}</strong></div>
        <div className="summary-card"><span>대기</span><strong>{cnt("대기")}</strong></div>
        <div className="summary-card"><span>성공</span><strong>{cnt("성공")}</strong></div>
        <div className="summary-card"><span>실패</span><strong>{cnt("실패")}</strong></div>
        <div className="summary-card">
          <span>성공률</span>
          <strong>
            {all.length ? Math.round((cnt("성공") / all.length) * 100) : 0}%
          </strong>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">
            발송 내역{" "}
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
              param="status"
              current={status}
              options={[
                { value: "대기", label: "대기" },
                { value: "성공", label: "성공" },
                { value: "실패", label: "실패" },
              ]}
            />
            {kinds.length > 0 && (
              <FilterSelect
                param="kind"
                current={kind}
                placeholder="종류 전체"
                ariaLabel="알림 종류 필터"
                options={kinds.map((k) => ({ value: k, label: k }))}
              />
            )}
            <div style={{ flex: 1 }} />
            <SearchInput
              param="q"
              current={q}
              placeholder="수신·템플릿 검색"
            />
            {hasFilter && (
              <Link className="btn" href="/admin/notifications">
                초기화
              </Link>
            )}
          </FilterBar>
        </div>

        <table>
          <thead>
            <tr>
              <th>일시</th>
              <th>종류</th>
              <th>수신</th>
              <th>템플릿</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((n) => (
              <tr key={n.id}>
                <td className="muted">
                  {n.created_at?.slice(0, 16).replace("T", " ")}
                </td>
                <td>
                  <span className="badge blue">{n.kind}</span>
                </td>
                <td className="muted">{n.recipient ?? "-"}</td>
                <td className="muted">{n.template ?? "-"}</td>
                <td>
                  <span className={`badge ${SB[n.status] ?? "gray"}`}>
                    {n.status}
                  </span>
                  {n.status === "실패" && n.error && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                      {n.error}
                    </div>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={5}>
                  <div className="empty-state">
                    {hasFilter ? (
                      <>
                        <strong>검색 결과가 없습니다</strong>
                        <p>필터·검색어를 조정해 보세요.</p>
                      </>
                    ) : (
                      <>
                        <strong>발송 로그가 없습니다</strong>
                        <p>
                          알림(FCM/알림톡) 연동 단계에서 발송 시 여기 기록됩니다.
                          구조·표시는 준비 완료.
                        </p>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
