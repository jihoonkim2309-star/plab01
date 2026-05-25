import Link from "next/link";
import { requireCenter } from "@/lib/center";
import { setMakeupStatus, deleteMakeup } from "./actions";
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
  searchParams: Promise<{ q?: string; class_id?: string; status?: string; makeup?: string }>;
}) {
  const { q, class_id, status, makeup: selectedId } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("makeups")
    .select("id, original_date, makeup_date, reason, status, class_id, classes(name)")
    .eq("center_id", cid)
    .order("makeup_date", { ascending: false });
  if (class_id) listQuery = listQuery.eq("class_id", class_id);
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, classesRes, allRes, selectedRes] = await Promise.all([
    listQuery,
    supabase.from("classes").select("id, name").eq("center_id", cid).order("name"),
    supabase.from("makeups").select("status").eq("center_id", cid),
    selectedId
      ? supabase
          .from("makeups")
          .select("id, original_date, makeup_date, reason, status, class_id, classes(name)")
          .eq("id", selectedId)
          .eq("center_id", cid)
          .maybeSingle()
      : Promise.resolve({ data: null }),
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
  const selected = selectedRes.data as unknown as M | null;
  const hasFilter = !!(q || class_id || status);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>보강 일정 관리</h1>
          <p className="subtext">휴강·결석에 따른 보강 수업 일정</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/makeups/new">보강 등록</Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체 보강</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>예정</span><strong>{totals.upcoming}</strong></div>
        <div className="summary-card"><span>완료</span><strong>{totals.done}</strong></div>
        <div className="summary-card"><span>취소</span><strong>{totals.canceled}</strong></div>
      </div>

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">
              보강 목록{" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter ? `검색결과 ${list.length}건 / 전체 ${totals.total}` : `${list.length}건`}
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
              {hasFilter && <Link className="btn" href="/admin/makeups">초기화</Link>}
            </FilterBar>
          </div>
          <table className="member-table">
            <thead>
              <tr>
                <th>클래스</th>
                <th>보강일</th>
                <th>사유</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className={`row-link-host ${m.id === selectedId ? "selected" : ""}`}>
                  <td>
                    <Link
                      href={`/admin/makeups?makeup=${m.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {m.classes?.name ?? "-"}
                    </Link>
                  </td>
                  <td className="muted">{m.makeup_date ?? "-"}</td>
                  <td className="muted">{m.reason ?? "-"}</td>
                  <td>
                    <span className={`badge ${SB[m.status] ?? "gray"}`}>{m.status}</span>
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
                          <strong>등록된 보강이 없습니다</strong>
                          <p>우측 상단 “보강 등록”으로 일정을 추가하세요.</p>
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
            <p className="panel-title">보강 상세</p>
            {selected && (
              <div className="toolbar">
                {selected.status !== "완료" && (
                  <form action={setMakeupStatus.bind(null, selected.id, "완료")}>
                    <button className="btn" type="submit">완료 처리</button>
                  </form>
                )}
                {selected.status !== "취소" && (
                  <form action={setMakeupStatus.bind(null, selected.id, "취소")}>
                    <ConfirmButton
                      message="이 보강을 취소 상태로 변경할까요?"
                      className="btn warn"
                      type="submit"
                    >
                      취소
                    </ConfirmButton>
                  </form>
                )}
                <form action={deleteMakeup.bind(null, selected.id)}>
                  <ConfirmButton
                    message="이 보강 일정을 삭제할까요?"
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
                <strong>선택된 보강이 없습니다</strong>
                <p>왼쪽 목록에서 보강 일정을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero" style={{ alignItems: "center" }}>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.classes?.name ?? "-"}</strong>
                    <div style={{ marginTop: 8 }}>
                      <span className={`badge ${SB[selected.status] ?? "gray"}`}>{selected.status}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">보강 정보</p>
                  <div className="info-list">
                    <div className="info-row"><span>원 수업일</span><strong>{selected.original_date ?? "-"}</strong></div>
                    <div className="info-row"><span>보강일</span><strong>{selected.makeup_date ?? "-"}</strong></div>
                    <div className="info-row"><span>사유</span><strong>{selected.reason ?? "-"}</strong></div>
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
