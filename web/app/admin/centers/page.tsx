import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export default async function CentersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; center?: string }>;
}) {
  const { saved, error, center: selectedId } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin") {
    return (
      <div className="page-head">
        <h1>접근 불가</h1>
        <p className="subtext">슈퍼 어드민만 지점을 관리할 수 있습니다.</p>
      </div>
    );
  }

  const [centersRes, usersRes, studentsRes, selectedRes] = await Promise.all([
    supabase
      .from("centers")
      .select("id, name, contact_phone, business_no, address, billing_day, report_day, created_at")
      .order("created_at", { ascending: true }),
    supabase.from("users").select("center_id, role").in("role", ["admin", "coach"]),
    supabase.from("students").select("center_id, status"),
    selectedId
      ? supabase
          .from("centers")
          .select("id, name, contact_phone, business_no, address, billing_day, report_day, created_at, subscription_plan, subscription_base_fee, subscription_per_student, subscription_revenue_pct, hq_billing_day")
          .eq("id", selectedId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const list = centersRes.data ?? [];
  const adminCount = new Map<string, number>();
  const coachCount = new Map<string, number>();
  for (const u of usersRes.data ?? []) {
    if (!u.center_id) continue;
    const m = u.role === "admin" ? adminCount : coachCount;
    m.set(u.center_id, (m.get(u.center_id) ?? 0) + 1);
  }
  const studentActiveCount = new Map<string, number>();
  for (const s of studentsRes.data ?? []) {
    if (!s.center_id || s.status !== "활성") continue;
    studentActiveCount.set(s.center_id, (studentActiveCount.get(s.center_id) ?? 0) + 1);
  }

  const selected = selectedRes.data;
  const selectedError = selectedId && !selected
    ? (selectedRes as { error?: { message?: string } | null }).error?.message ?? null
    : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>지점 관리</h1>
          <p className="subtext">프랜차이즈 지점 등록·정보·사용료 정책 관리</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/centers/new">지점 개설</Link>
        </div>
      </div>

      {saved && (
        <div className="panel" style={banner("green")}>저장되었습니다.</div>
      )}
      {error && (
        <div className="panel" style={banner("red")}>{error}</div>
      )}

      <div className="member-summary">
        <div className="summary-card"><span>전체 지점</span><strong>{list.length}</strong></div>
        <div className="summary-card">
          <span>전체 관리자</span>
          <strong>{[...adminCount.values()].reduce((a, b) => a + b, 0)}</strong>
        </div>
        <div className="summary-card">
          <span>전체 코치</span>
          <strong>{[...coachCount.values()].reduce((a, b) => a + b, 0)}</strong>
        </div>
        <div className="summary-card">
          <span>활성 학생</span>
          <strong>{[...studentActiveCount.values()].reduce((a, b) => a + b, 0)}</strong>
        </div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              지점 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {list.length}건
              </span>
            </p>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>지점명</th>
                <th>관리자/코치</th>
                <th>활성 학생</th>
                <th>결제일</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} className={`row-link-host ${c.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/centers?center=${c.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {c.name}
                    </Link>
                  </td>
                  <td className="muted">
                    {adminCount.get(c.id) ?? 0} / {coachCount.get(c.id) ?? 0}
                  </td>
                  <td className="muted">{studentActiveCount.get(c.id) ?? 0}</td>
                  <td className="muted">매월 {c.billing_day}일</td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={4}>
                    <div className="empty-state">
                      <strong>등록된 지점이 없습니다</strong>
                      <p>우측 상단 “지점 개설”로 첫 지점을 추가하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">지점 상세</p>
            {selected && (
              <div className="toolbar">
                <Link className="btn primary" href={`/admin/centers/${selected.id}/edit`}>수정</Link>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              selectedError ? (
                <div className="empty-state">
                  <strong>지점 정보를 불러올 수 없습니다</strong>
                  <p style={{ color: "var(--red)", fontSize: 13 }}>{selectedError}</p>
                  <p style={{ marginTop: 8 }}>
                    Supabase SQL Editor 에서 schema.sql 재실행이 필요할 수 있습니다.
                    (사용료 정책 컬럼 누락 등)
                  </p>
                </div>
              ) : (
                <div className="empty-state">
                  <strong>선택된 지점이 없습니다</strong>
                  <p>왼쪽 목록에서 지점을 선택해 주세요.</p>
                </div>
              )
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                    <div className="muted" style={{ marginTop: 4 }}>
                      개설일 {selected.created_at?.slice(0, 10) ?? "-"}
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">지점 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>대표 연락처</span><strong>{selected.contact_phone ?? "-"}</strong></div>
                    <div className="info-row"><span>사업자등록번호</span><strong>{selected.business_no ?? "-"}</strong></div>
                    <div className="info-row"><span>주소</span><strong>{selected.address ?? "-"}</strong></div>
                    <div className="info-row"><span>결제일</span><strong>매월 {selected.billing_day}일</strong></div>
                    <div className="info-row"><span>리포트 발행일</span><strong>매월 {selected.report_day}일</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">소속 현황</p>
                  <div className="info-list">
                    <div className="info-row"><span>관리자</span><strong>{adminCount.get(selected.id) ?? 0}명</strong></div>
                    <div className="info-row"><span>코치</span><strong>{coachCount.get(selected.id) ?? 0}명</strong></div>
                    <div className="info-row"><span>활성 학생</span><strong>{studentActiveCount.get(selected.id) ?? 0}명</strong></div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">본사 사용료 정책</p>
                  <div className="info-list">
                    <div className="info-row"><span>요금 체계</span><strong>{selected.subscription_plan ?? "정액"}</strong></div>
                    {selected.subscription_plan === "정액" && (
                      <div className="info-row"><span>정액 기본료</span><strong>{(selected.subscription_base_fee ?? 0).toLocaleString()}원</strong></div>
                    )}
                    {selected.subscription_plan === "학생수" && (
                      <div className="info-row"><span>학생당 이용요금</span><strong>{(selected.subscription_per_student ?? 0).toLocaleString()}원</strong></div>
                    )}
                    {selected.subscription_plan === "매출비례" && (
                      <div className="info-row"><span>매출 %</span><strong>{(selected.subscription_revenue_pct ?? 0)}%</strong></div>
                    )}
                    <div className="info-row"><span>본사 청구일</span><strong>매월 {selected.hq_billing_day ?? 1}일</strong></div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

function banner(tone: "green" | "red") {
  if (tone === "green") {
    return {
      background: "var(--green-soft)",
      borderColor: "#b8dccb",
      color: "var(--green)",
      padding: "12px 16px",
    } as const;
  }
  return {
    background: "var(--red-soft, #fdecec)",
    borderColor: "#f3b1b1",
    color: "var(--red)",
    padding: "12px 16px",
  } as const;
}
