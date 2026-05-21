import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createHoliday, deleteHoliday } from "./actions";
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
  searchParams: Promise<{ q?: string; class_id?: string; past?: string }>;
}) {
  const { q, class_id, past } = await searchParams;
  const supabase = await createClient();

  const today = new Date().toISOString().slice(0, 10);

  let listQuery = supabase
    .from("holidays")
    .select("id, holiday_date, reason, notify, class_id, classes(name)")
    .order("holiday_date", { ascending: false });
  if (class_id) listQuery = listQuery.eq("class_id", class_id);
  if (past !== "show") listQuery = listQuery.gte("holiday_date", today);

  const [listRes, classesRes, allRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("holidays").select("holiday_date"),
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
  const hasFilter = !!(q || class_id || past === "show");

  return (
    <>
      <div className="page-head">
        <div>
          <h1>휴강일 관리</h1>
          <p className="subtext">전체 휴강 또는 특정 클래스 휴강 · 시간표에 반영</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 휴강</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>예정</span><strong>{totals.upcoming}</strong></div>
        <div className="summary-card"><span>지난 휴강</span><strong>{totals.pastCount}</strong></div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
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
              {hasFilter && (
                <Link className="btn" href="/admin/holidays">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th>휴강일</th>
                <th>대상</th>
                <th>사유</th>
                <th>알림</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((h) => {
                const isPast = h.holiday_date < today;
                return (
                  <tr key={h.id} style={isPast ? { opacity: 0.55 } : undefined}>
                    <td>
                      <strong>{h.holiday_date}</strong>
                    </td>
                    <td className="muted">
                      {h.class_id ? (
                        <Link
                          href={`/admin/classes/${h.class_id}/edit`}
                          style={{ color: "var(--text)" }}
                        >
                          {h.classes?.name ?? "클래스"}
                        </Link>
                      ) : (
                        "전체 휴강"
                      )}
                    </td>
                    <td className="muted">{h.reason ?? "-"}</td>
                    <td>
                      {h.notify ? (
                        <span className="badge blue">발송</span>
                      ) : (
                        <span className="badge gray">미발송</span>
                      )}
                    </td>
                    <td>
                      <form action={deleteHoliday.bind(null, h.id)}>
                        <ConfirmButton
                          message={`${h.holiday_date} 휴강을 삭제할까요?`}
                          className="btn danger"
                          style={{ minHeight: 30, padding: "4px 10px" }}
                          type="submit"
                        >
                          삭제
                        </ConfirmButton>
                      </form>
                    </td>
                  </tr>
                );
              })}
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
                          <strong>예정된 휴강이 없습니다</strong>
                          <p>우측에서 휴강일을 등록하세요. 지난 휴강을 보려면 "지난 휴강 포함" 클릭.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createHoliday} className="panel">
          <div className="panel-head">
            <p className="panel-title">휴강 등록</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>휴강일 *</label>
              <input
                name="holiday_date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
                required
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>대상</label>
              <select name="class_id" defaultValue="">
                <option value="">전체 휴강</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>사유</label>
              <input name="reason" placeholder="예: 공휴일 / 시설 점검" />
            </div>
            <label
              style={{
                display: "flex",
                gap: 8,
                alignItems: "center",
                marginTop: 12,
                fontSize: 13,
              }}
            >
              <input type="checkbox" name="notify" /> 학부모 알림 발송 표시
            </label>
            <div className="detail-actions">
              <button className="btn primary" type="submit">휴강 등록</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
