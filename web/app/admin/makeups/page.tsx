import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createMakeup, setMakeupStatus, deleteMakeup } from "./actions";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import FilterSelect from "../FilterSelect";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";

type M = {
  id: string;
  original_date: string | null;
  makeup_date: string | null;
  reason: string | null;
  status: string;
  class_id: string | null;
  classes: { name: string } | null;
};

const SB: Record<string, string> = {
  예정: "blue",
  완료: "green",
  취소: "gray",
};

export default async function MakeupsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; class_id?: string; status?: string }>;
}) {
  const { q, class_id, status } = await searchParams;
  const supabase = await createClient();

  let listQuery = supabase
    .from("makeups")
    .select("id, original_date, makeup_date, reason, status, class_id, classes(name)")
    .order("makeup_date", { ascending: false });
  if (class_id) listQuery = listQuery.eq("class_id", class_id);
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, classesRes, allRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("id, name").order("name"),
    supabase.from("makeups").select("status"),
  ]);

  let raw = (listRes.data ?? []) as unknown as M[];
  if (q) {
    const needle = q.toLowerCase();
    raw = raw.filter((m) => {
      const r = (m.reason ?? "").toLowerCase();
      const c = (m.classes?.name ?? "").toLowerCase();
      return r.includes(needle) || c.includes(needle);
    });
  }
  const list = raw;
  const classes = classesRes.data ?? [];

  const all = (allRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    upcoming: all.filter((m) => m.status === "예정").length,
    done: all.filter((m) => m.status === "완료").length,
    canceled: all.filter((m) => m.status === "취소").length,
  };
  const hasFilter = !!(q || class_id || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>보강 일정 관리</h1>
          <p className="subtext">휴강·결석에 따른 보강 수업 일정</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 보강</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>예정</span><strong>{totals.upcoming}</strong></div>
        <div className="summary-card"><span>완료</span><strong>{totals.done}</strong></div>
        <div className="summary-card"><span>취소</span><strong>{totals.canceled}</strong></div>
      </div>

      <div className="grid two-col">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              보강 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
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
                  { value: "예정", label: "예정" },
                  { value: "완료", label: "완료" },
                  { value: "취소", label: "취소" },
                ]}
              />
              <FilterSelect
                param="class_id"
                current={class_id}
                placeholder="클래스 전체"
                ariaLabel="클래스 필터"
                options={classes.map((c) => ({ value: c.id, label: c.name }))}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="사유·클래스 검색" />
              {hasFilter && (
                <Link className="btn" href="/admin/makeups">
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th>클래스</th>
                <th>원수업일</th>
                <th>보강일</th>
                <th>사유</th>
                <th>상태</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id}>
                  <td>
                    {m.class_id ? (
                      <Link
                        href={`/admin/classes/${m.class_id}/edit`}
                        style={{ color: "var(--text)", fontWeight: 900 }}
                      >
                        {m.classes?.name ?? "-"}
                      </Link>
                    ) : (
                      <strong>{m.classes?.name ?? "-"}</strong>
                    )}
                  </td>
                  <td className="muted">{m.original_date ?? "-"}</td>
                  <td className="muted">{m.makeup_date ?? "-"}</td>
                  <td className="muted">{m.reason ?? "-"}</td>
                  <td>
                    <span className={`badge ${SB[m.status] ?? "gray"}`}>
                      {m.status}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: "flex", gap: 6 }}>
                      {m.status !== "완료" && (
                        <form action={setMakeupStatus.bind(null, m.id, "완료")}>
                          <button
                            className="btn"
                            style={{ minHeight: 30, padding: "4px 10px" }}
                            type="submit"
                          >
                            완료
                          </button>
                        </form>
                      )}
                      {m.status !== "취소" && (
                        <form action={setMakeupStatus.bind(null, m.id, "취소")}>
                          <ConfirmButton
                            message="이 보강을 취소 상태로 변경할까요?"
                            className="btn warn"
                            style={{ minHeight: 30, padding: "4px 10px" }}
                            type="submit"
                          >
                            취소
                          </ConfirmButton>
                        </form>
                      )}
                      <form action={deleteMakeup.bind(null, m.id)}>
                        <ConfirmButton
                          message="이 보강 일정을 삭제할까요?"
                          className="btn danger"
                          style={{ minHeight: 30, padding: "4px 10px" }}
                          type="submit"
                        >
                          삭제
                        </ConfirmButton>
                      </form>
                    </div>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>등록된 보강이 없습니다</strong>
                          <p>우측에서 보강 일정을 등록하세요.</p>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <form action={createMakeup} className="panel">
          <div className="panel-head">
            <p className="panel-title">보강 등록</p>
          </div>
          <div className="panel-body">
            <div className="field">
              <label>클래스 *</label>
              <select name="class_id" required defaultValue="">
                <option value="" disabled>
                  클래스 선택
                </option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>원 수업일</label>
              <input
                name="original_date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>보강일</label>
              <input
                name="makeup_date"
                type="date"
                min="1900-01-01"
                max="2100-12-31"
              />
            </div>
            <div className="field" style={{ marginTop: 12 }}>
              <label>사유</label>
              <input name="reason" placeholder="예: 휴강 보강 / 결석 보강" />
            </div>
            <div className="detail-actions">
              <button className="btn primary" type="submit">보강 등록</button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
