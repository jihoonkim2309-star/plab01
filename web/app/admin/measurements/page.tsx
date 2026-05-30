import Link from "next/link";
import { requireStaff } from "@/lib/center";
import MonthNav from "../MonthNav";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import {
  approveMeasurement,
  deleteMeasurement,
  rejectMeasurement,
  reopenMeasurement,
  saveMeasurement,
  seedDemoMeasurements,
  submitMeasurement,
} from "./actions";

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

  // items 는 위 병렬 배치에서 미리 가져와 둠 — selected 가 없으면 그냥 안 그림
  const items = selected ? (itemsRes.data ?? []) : [];

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
    <>
      <div className="page-head">
        <div>
          <h1>측정 데이터 관리</h1>
          <p className="subtext">월별 측정값 입력 → 승인 시 리포트 관리에서 자동 생성</p>
        </div>
        <div className="toolbar">
          <MonthNav
            ym={target}
            baseUrl="/admin/measurements"
            extra={{ sid }}
          />
          {isAdmin && (
            <form action={seedDemoMeasurements}>
              <input type="hidden" name="ym" value={target} />
              <button className="btn" type="submit" title="모든 활성 학생에 더미 측정값 + 승인완료">
                데모 측정 데이터 채우기
              </button>
            </form>
          )}
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
                    className={`row-link-host ${selected?.id === s.id ? "selected" : ""}`}
                  >
                    <td>
                      <Link
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
                      </Link>
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

        {/* 우: 측정 폼 */}
        <div className="panel elevated">
          {!selected ? (
            <>
              <div className="panel-head">
                <p className="panel-title">측정 입력</p>
              </div>
              <div className="panel-body">
                <div className="empty-state">
                  <strong>학생을 선택하세요</strong>
                  <p>좌측에서 학생을 선택하면 항목별 측정값을 입력할 수 있습니다.</p>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="panel-head">
                <p className="panel-title">
                  <Link
                    href={`/admin/students?student=${selected.id}`}
                    style={{ color: "var(--text)" }}
                  >
                    {selected.name}
                  </Link>{" "}
                  · {target}
                </p>
                <span
                  className={`badge ${STATUS_BADGE[m?.status ?? "대기"] ?? "gray"}`}
                >
                  {m?.status ?? "대기"}
                </span>
              </div>

              {(items ?? []).length === 0 && (
                <div className="panel-body">
                  <div className="empty-state">
                    <strong>측정 항목이 없습니다</strong>
                    <p>
                      먼저{" "}
                      <Link href="/admin/measurement-items">측정 항목 관리</Link>
                      에서 항목을 등록(또는 시드 적용)하세요.
                    </p>
                  </div>
                </div>
              )}

              {(items ?? []).length > 0 && (
                <div className="panel-body">
                  {m?.reject_reason && (
                    <div
                      className="panel"
                      style={{
                        background: "var(--red-soft, #fdecec)",
                        borderColor: "#f3b1b1",
                        padding: "10px 12px",
                        marginBottom: 12,
                      }}
                    >
                      <strong>반려 사유</strong> · {m.reject_reason}
                    </div>
                  )}

                  <form action={saveMeasurement} className="form-grid">
                    <input type="hidden" name="student_id" value={selected.id} />
                    <input type="hidden" name="ym" value={target} />

                    {[...groups.entries()].map(([cat, arr]) => (
                      <div key={cat} className="span-2">
                        <h3
                          style={{
                            margin: "12px 0 8px",
                            fontSize: 14,
                            fontWeight: 700,
                          }}
                        >
                          {cat}
                        </h3>
                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: "1fr 1fr",
                            gap: 8,
                          }}
                        >
                          {(arr ?? []).map((it) => {
                            const v = valById.get(it.id);
                            const dv =
                              v?.value_num != null
                                ? String(v.value_num)
                                : (v?.value_text ?? "");
                            return (
                              <div key={it.id} className="field">
                                <label>
                                  {it.name}
                                  {it.unit ? (
                                    <span className="muted"> ({it.unit})</span>
                                  ) : null}
                                </label>
                                <input
                                  name={`v_${it.id}`}
                                  type={
                                    it.value_kind === "number"
                                      ? "number"
                                      : "text"
                                  }
                                  step="any"
                                  defaultValue={dv}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    <div className="field span-2">
                      <label>메모</label>
                      <textarea
                        name="notes"
                        defaultValue={m?.notes ?? ""}
                        rows={2}
                      />
                    </div>

                    <div
                      className="span-2 toolbar"
                      style={{ justifyContent: "flex-start" }}
                    >
                      <button className="btn primary" type="submit">
                        저장
                      </button>
                    </div>
                  </form>

                  {/* 상태 전환 */}
                  {m && (
                    <div
                      className="toolbar"
                      style={{ justifyContent: "flex-start", marginTop: 8 }}
                    >
                      {(m.status === "대기" || m.status === "반려") && (
                        <form action={submitMeasurement}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className="btn" type="submit">
                            입력 완료로 처리
                          </button>
                        </form>
                      )}
                      {m.status === "입력완료" && isAdmin && (
                        <>
                          <form action={approveMeasurement}>
                            <input type="hidden" name="id" value={m.id} />
                            <button className="btn primary" type="submit">
                              승인
                            </button>
                          </form>
                          <form action={rejectMeasurement}>
                            <input type="hidden" name="id" value={m.id} />
                            <input
                              name="reject_reason"
                              placeholder="반려 사유 (필수)"
                              required
                              minLength={2}
                              style={{ width: 200 }}
                            />
                            <button className="btn" type="submit">
                              반려
                            </button>
                          </form>
                        </>
                      )}
                      {isAdmin && m.status !== "대기" && (
                        <form action={reopenMeasurement}>
                          <input type="hidden" name="id" value={m.id} />
                          <button className="btn" type="submit">
                            다시 입력으로
                          </button>
                        </form>
                      )}
                      {isAdmin && (
                        <form action={deleteMeasurement}>
                          <input type="hidden" name="id" value={m.id} />
                          <input type="hidden" name="ym" value={target} />
                          <ConfirmButton
                            message={`'${selected.name}'의 ${target} 측정값을 삭제할까요? 입력값이 모두 사라집니다.`}
                            className="btn danger"
                            type="submit"
                          >
                            삭제
                          </ConfirmButton>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
