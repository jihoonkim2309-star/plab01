import { requireSuperAdmin } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import { InquiryDrawerProvider } from "./InquiryDrawerContext";
import InquiryRowLink from "./InquiryRowLink";
import InquiryDetailPanel from "./InquiryDetailPanel";

const STATUS_BADGE: Record<string, string> = {
  접수: "orange",
  처리중: "blue",
  완료: "green",
};

export default async function HqInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const { supabase, userId } = await requireSuperAdmin();

  const [listRes, readsRes] = await Promise.all([
    supabase
      .from("inquiries")
      .select("id, subject, status, center_id, centers(name), created_at, updated_at")
      .eq("kind", "branch_to_hq")
      .order("updated_at", { ascending: false })
      .limit(200),
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
  const readMap = new Map(
    ((readsRes.data ?? []) as { inquiry_id: string; last_read_at: string }[]).map(
      (r) => [r.inquiry_id, r.last_read_at],
    ),
  );

  return (
    <InquiryDrawerProvider>
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
                    <tr key={i.id} className="row-link-host">
                      <td className="muted">{i.centers?.name ?? "-"}</td>
                      <td>
                        <InquiryRowLink
                          inquiryId={i.id}
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
                        </InquiryRowLink>
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

        <InquiryDetailPanel />
      </div>
    </InquiryDrawerProvider>
  );
}
