import Link from "next/link";
import { requireStaff } from "@/lib/center";
import MonthNav from "../MonthNav";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import { MeasurementDrawerProvider } from "./MeasurementDrawerContext";
import MeasurementDetailDrawer from "./MeasurementDetailDrawer";
import MeasurementRowLink from "./MeasurementRowLink";
import { approveAllInputComplete } from "./actions";
import ConfirmButton from "../ConfirmButton";

const pad = (n: number) => String(n).padStart(2, "0");
function thisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

const STATUS_BADGE: Record<string, string> = {
  대기: "gray",
  입력완료: "blue",
  승인완료: "green",
  반려: "red",
};

export default async function MeasurementsPage({
  searchParams,
}: {
  searchParams: Promise<{
    ym?: string;
    sid?: string;
    q?: string;
    status?: string;
  }>;
}) {
  const { ym, sid, q, status } = await searchParams;
  const target = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : thisMonth();
  const { supabase, centerId: cid, role } = await requireStaff();

  // 그 달 청구 발행된 학생 (결제완료 + 미납 + 실패, 환불 제외) 만 측정 대상.
  // 학부모 보류 / 환불 / 청구 없음 학생은 자동 제외 — 학원 운영 모델 반영.
  const { data: invoiced } = await supabase
    .from("invoices")
    .select("student_id")
    .eq("center_id", cid)
    .eq("period", target)
    .in("status", ["결제완료", "청구", "실패"]);
  const eligibleIds = Array.from(
    new Set((invoiced ?? []).map((i) => i.student_id).filter(Boolean)),
  );

  // 학생 목록 + 그 달 measurements + 활성 항목 → 한 번에 병렬
  let studentsQuery = supabase
    .from("students")
    .select("id, name, school, grade, gender, birth")
    .eq("center_id", cid)
    .eq("status", "정상")
    .order("name", { ascending: true });
  if (eligibleIds.length === 0) {
    studentsQuery = studentsQuery.eq("id", "00000000-0000-0000-0000-000000000000");
  } else {
    studentsQuery = studentsQuery.in("id", eligibleIds);
  }

  const [studentsRes, msRes, itemsRes] = await Promise.all([
    studentsQuery,
    supabase
      .from("measurements")
      .select(
        "id, student_id, status, measured_at, reviewed_at, reject_reason, notes",
      )
      .eq("center_id", cid)
      .eq("measurement_month", target),
    supabase
      .from("measurement_items")
      .select("id, category, name, unit, value_kind, sort_order, active")
      .eq("center_id", cid)
      .eq("active", true)
      .order("sort_order", { ascending: true }),
  ]);
  const isAdmin = role === "admin";
  const students = studentsRes.data;
  const ms = msRes.data;

  const mByStudent = new Map(
    (ms ?? []).map((m) => [m.student_id, m]),
  );

  const allStudents = students ?? [];
  // 필터 무관 totals (요약카드용)
  const cnt = (s: string) =>
    allStudents.filter(
      (st) => (mByStudent.get(st.id)?.status ?? "대기") === s,
    ).length;

  // 좌측 학생 목록에 검색·상태 필터 적용
  const needle = q?.toLowerCase() ?? "";
  const list = allStudents.filter((st) => {
    if (status) {
      const cur = mByStudent.get(st.id)?.status ?? "대기";
      if (cur !== status) return false;
    }
    if (needle) {
      const name = (st.name ?? "").toLowerCase();
      const school = (st.school ?? "").toLowerCase();
      if (!name.includes(needle) && !school.includes(needle)) return false;
    }
    return true;
  });
  const hasFilter = !!(q || status);

  // 우측 디테일 — 필터에 가려져도 sid 가 있으면 학생 정보는 표시
  const selected = sid
    ? allStudents.find((s) => s.id === sid) ?? null
    : null;
  const m = selected ? mByStudent.get(selected.id) ?? null : null;

  // 측정 항목 — drawer 에 props 로 전달, selectedId 무관 항상 fetch
  const items = itemsRes.data ?? [];

  // values 는 measurement_id 가 정해진 뒤에야 조회 가능 → 마지막 단일 쿼리
  const { data: values } = m
    ? await supabase
        .from("measurement_values")
        .select("item_id, value_num, value_text")
        .eq("measurement_id", m.id)
    : { data: [] };
  const valById = new Map(
    (values ?? []).map((v) => [v.item_id, v]),
  );

  // 카테고리별 그룹
  const groups = new Map<string, typeof items>();
  for (const it of items ?? []) {
    const arr = groups.get(it.category) ?? [];
    arr.push(it);
    groups.set(it.category, arr);
  }

  // sid 전환 시 ym + 현재 q/status 보존, 초기화 링크에서는 호출자가 q/status 비활성으로 호출
  const navUrl = (p: {
    ym?: string;
    sid?: string | null;
    keepFilter?: boolean;
  }) => {
    const qs = new URLSearchParams();
    if (p.ym) qs.set("ym", p.ym);
    if (p.sid) qs.set("sid", p.sid);
    if (p.keepFilter) {
      if (q) qs.set("q", q);
      if (status) qs.set("status", status);
    }
    return `/admin/measurements${qs.toString() ? `?${qs}` : ""}`;
  };

  return (
    <MeasurementDrawerProvider>
      <div className="page-head">
        <div>
          <h1>측정 데이터 관리</h1>
          <p className="subtext">월별 측정값 입력 → 승인 시 리포트 관리에서 자동 생성</p>
        </div>
        <div className="toolbar">
          {cnt("입력완료") > 0 && (
            <form action={approveAllInputComplete}>
              <input type="hidden" name="ym" value={target} />
              <ConfirmButton
                className="btn primary"
                message={`${target} 입력완료 ${cnt("입력완료")}건을 모두 승인할까요? 승인 후 리포트가 자동 생성됩니다.`}
              >
                입력완료 {cnt("입력완료")}건 일괄 승인
              </ConfirmButton>
            </form>
          )}
          <MonthNav
            ym={target}
            baseUrl="/admin/measurements"
            extra={{ sid }}
          />
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>대상 학생</span>
          <strong>{allStudents.length}</strong>
        </div>
        <div className="summary-card">
          <span>대기</span>
          <strong>{cnt("대기")}</strong>
        </div>
        <div className="summary-card">
          <span>입력완료</span>
          <strong>{cnt("입력완료")}</strong>
        </div>
        <div className="summary-card">
          <span>승인완료</span>
          <strong>{cnt("승인완료")}</strong>
        </div>
        <div className="summary-card">
          <span>반려</span>
          <strong>{cnt("반려")}</strong>
        </div>
      </div>

      <div className="grid account-layout">
        {/* 좌: 학생 목록 */}
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">
              학생 ({target}){" "}
              <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
                {hasFilter
                  ? `검색결과 ${list.length}건 / 전체 ${allStudents.length}`
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
                  { value: "입력완료", label: "입력완료" },
                  { value: "승인완료", label: "승인완료" },
                  { value: "반려", label: "반려" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="학생·학교 검색" />
              {hasFilter && (
                <Link
                  className="btn"
                  href={navUrl({ ym: target, sid: sid ?? null })}
                >
                  초기화
                </Link>
              )}
            </FilterBar>
          </div>
          <table>
            <thead>
              <tr>
                <th>학생</th>
                <th>학교/학년</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const st = mByStudent.get(s.id)?.status ?? "대기";
                return (
                  <tr
                    key={s.id}
                    className="row-link-host"
                  >
                    <td>
                      <MeasurementRowLink
                        studentId={s.id}
                        href={navUrl({
                          ym: target,
                          sid: s.id,
                          keepFilter: true,
                        })}
                        className="row-link-stretch"
                        style={{ color: "inherit" }}
                      >
                        <strong>{s.name}</strong>
                        <div className="muted" style={{ fontSize: 12 }}>
                          {s.gender ?? ""} {s.birth ?? ""}
                        </div>
                      </MeasurementRowLink>
                    </td>
                    <td className="muted">
                      {s.school ?? "-"} {s.grade ?? ""}
                    </td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[st] ?? "gray"}`}>
                        {st}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={3}>
                    <div className="empty-state">
                      {hasFilter ? (
                        <>
                          <strong>검색 결과가 없습니다</strong>
                          <p>필터·검색어를 조정해 보세요.</p>
                        </>
                      ) : (
                        <>
                          <strong>측정 대상 학생이 없습니다</strong>
                          <p>
                            {target} 청구가 발행된 학생만 측정 대상입니다.{" "}
                            <Link href={`/admin/renewals?ym=${target}`}>다음 달 수강 확인</Link>
                            에서 수강 확정 → <Link href={`/admin/billing?ym=${target}`}>청구 관리</Link>
                            에서 청구 발행이 되어야 합니다.
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

        <MeasurementDetailDrawer ym={target} items={items ?? []} isAdmin={isAdmin} />
      </div>
    </MeasurementDrawerProvider>
  );
}
