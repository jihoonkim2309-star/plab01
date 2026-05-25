import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { deleteHoliday } from "./actions";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import FilterSelect from "../FilterSelect";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";

type H = {
  id: string;
  holiday_date: string;
  reason: string | null;
  notify: boolean;
  class_id: string | null;
  classes: { name: string } | null;
};

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; class_id?: string; past?: string; holiday?: string }>;
}) {
  const { q, class_id, past, holiday: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();
  const today = new Date().toISOString().slice(0, 10);

  let listQuery = supabase
    .from("holidays")
    .select("id, holiday_date, reason, notify, class_id, classes(name)")
    .eq("center_id", cid)
    .order("holiday_date", { ascending: false });
  if (class_id) listQuery = listQuery.eq("class_id", class_id);
  if (past !== "show") listQuery = listQuery.gte("holiday_date", today);

  const [listRes, classesRes, allRes, selectedRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("id, name").eq("center_id", cid).order("name"),
    supabase.from("holidays").select("holiday_date").eq("center_id", cid),
    selectedId
      ? supabase
          .from("holidays")
          .select("id, holiday_date, reason, notify, class_id, classes(name)")
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  let raw = (listRes.data ?? []) as unknown as H[];
  if (q) {
    const needle = q.toLowerCase();
    raw = raw.filter((h) => {
      const r = (h.reason ?? "").toLowerCase();
      const c = (h.classes?.name ?? "").toLowerCase();
      return r.includes(needle) || c.includes(needle);
    });
  }
  const list = raw;
  const classes = classesRes.data ?? [];
  const all = (allRes.data ?? []) as { holiday_date: string }[];
  const totals = {
    total: all.length,
    upcoming: all.filter((h) => h.holiday_date >= today).length,
    pastCount: all.filter((h) => h.holiday_date < today).length,
  };
  const selected = selectedRes.data as unknown as H | null;
  const hasFilter = !!(q || class_id || past === "show");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>휴강일 관리</h1>
          <p className="subtext">전체 휴강 또는 특정 클래스 휴강 · 시간표에 반영</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/holidays/new">휴강 등록</Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 휴강</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>예정</span><strong>{totals.upcoming}</strong></div>
        <div className="summary-card"><span>지난 휴강</span><strong>{totals.pastCount}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              휴강 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / ${past === "show" ? `전체 ${totals.total}` : `예정 ${totals.upcoming}`}`
                  : `${list.length}건`}
              </span>
            </p>
          </div>
          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="past"
                current={past}
                allLabel="예정만"
                options={[{ value: "show", label: "지난 휴강 포함" }]}
              />
              <FilterSelect
                param="class_id"
                current={class_id}
                placeholder="대상 전체"
                ariaLabel="대상 클래스 필터"
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="사유·클래스 검색" />
              {hasFilter && <Link className="btn" href="/admin/holidays">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>휴강일</th>
                <th>대상</th>
                <th>사유</th>
                <th>알림</th>
              </tr>
            </thead>
            <tbody>
              {list.map((h) => {
                const isPast = h.holiday_date < today;
                return (
                  <tr
                    key={h.id}
                    className={`row-link-host ${h.id === selectedId ? "selected" : ""}`}
                    style={isPast ? { opacity: 0.55 } : undefined}
                  >
                    <td>
                      <Link
                        href={`/admin/holidays?holiday=${h.id}${past === "show" ? "&past=show" : ""}`}
                        className="row-link-stretch"
                        style={{ fontWeight: 900, color: "var(--text)" }}
                      >
                        {h.holiday_date}
                      </Link>
                    </td>
                    <td className="muted">{h.class_id ? h.classes?.name ?? "클래스" : "전체 휴강"}</td>
                    <td className="muted">{h.reason ?? "-"}</td>
                    <td>
                      {h.notify ? <span className="badge blue">발송</span> : <span className="badge gray">미발송</span>}
                    </td>
                  </tr>
                );
              })}
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
                          <strong>예정된 휴강이 없습니다</strong>
                          <p>우측 상단 “휴강 등록”으로 추가하세요.</p>
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
          <div className="panel-head">
            <p className="panel-title">휴강 상세</p>
            {selected && (
              <div className="toolbar">
                <form action={deleteHoliday.bind(null, selected.id)}>
                  <ConfirmButton
                    message={`${selected.holiday_date} 휴강을 삭제할까요?`}
                    className="btn danger"
                    type="submit"
                  >
                    삭제
                  </ConfirmButton>
                </form>
              </div>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 휴강이 없습니다</strong>
                <p>왼쪽 목록에서 휴강일을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.holiday_date}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className="badge red">휴강</span>{" "}
                      {selected.notify ? (
                        <span className="badge blue">알림 발송</span>
                      ) : (
                        <span className="badge gray">알림 미발송</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">휴강 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>대상</span><strong>{selected.class_id ? selected.classes?.name ?? "클래스" : "전체 휴강"}</strong></div>
                    <div className="info-row"><span>사유</span><strong>{selected.reason ?? "-"}</strong></div>
                    <div className="info-row"><span>알림</span><strong>{selected.notify ? "발송 표시" : "미발송"}</strong></div>
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
