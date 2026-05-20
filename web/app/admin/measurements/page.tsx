import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  approveMeasurement,
  deleteMeasurement,
  rejectMeasurement,
  reopenMeasurement,
  saveMeasurement,
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
  searchParams: Promise<{ ym?: string; sid?: string }>;
}) {
  const { ym, sid } = await searchParams;
  const target = ym && /^\d{4}-\d{2}$/.test(ym) ? ym : thisMonth();
  const supabase = await createClient();

  // 어드민/코치 권한 + 자기 role 확인 (UI 분기용)
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user?.id ?? "")
    .single();
  const isAdmin = me?.role === "admin";

  // 학생 전체(같은 센터, 활성)
  const { data: students } = await supabase
    .from("students")
    .select("id, name, school, grade, gender, birth")
    .eq("status", "활성")
    .order("name", { ascending: true });

  // 그 달의 measurements
  const { data: ms } = await supabase
    .from("measurements")
    .select(
      "id, student_id, status, measured_at, reviewed_at, reject_reason, notes",
    )
    .eq("measurement_month", target);

  const mByStudent = new Map(
    (ms ?? []).map((m) => [m.student_id, m]),
  );

  const list = students ?? [];
  const cnt = (s: string) =>
    list.filter((st) => (mByStudent.get(st.id)?.status ?? "대기") === s).length;

  // 우측 디테일
  const selected = sid ? list.find((s) => s.id === sid) ?? null : null;
  const m = selected ? mByStudent.get(selected.id) ?? null : null;

  const { data: items } = selected
    ? await supabase
        .from("measurement_items")
        .select("id, category, name, unit, value_kind, sort_order, active")
        .eq("active", true)
        .order("sort_order", { ascending: true })
    : { data: [] };

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

  // 월 네비
  const [y, mo] = target.split("-").map(Number);
  const prev = new Date(y, mo - 2, 1);
  const next = new Date(y, mo, 1);
  const prevYm = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}`;
  const nextYm = `${next.getFullYear()}-${pad(next.getMonth() + 1)}`;
  const navUrl = (p: { ym?: string; sid?: string | null }) => {
    const qs = new URLSearchParams();
    if (p.ym) qs.set("ym", p.ym);
    if (p.sid) qs.set("sid", p.sid);
    return `/admin/measurements${qs.toString() ? `?${qs}` : ""}`;
  };

  return (
    <>
      <div className="page-head">
        <div>
          <h1>측정 데이터 관리</h1>
          <p className="subtext">
            {target} · 코치 입력 → 어드민 승인 → 리포트 생성으로 이어집니다
          </p>
        </div>
        <div className="toolbar">
          <Link className="btn" href={navUrl({ ym: prevYm, sid })}>
            ← {prevYm}
          </Link>
          <Link className="btn" href={navUrl({ ym: nextYm, sid })}>
            {nextYm} →
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>대상 학생</span>
          <strong>{list.length}</strong>
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
            <p className="panel-title">학생 ({target})</p>
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
                    className={selected?.id === s.id ? "selected" : ""}
                  >
                    <td>
                      <Link
                        href={navUrl({ ym: target, sid: s.id })}
                        style={{ textDecoration: "none", color: "inherit" }}
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
                      <strong>학생이 없습니다</strong>
                      <p>학생 등록 후 측정을 입력할 수 있습니다.</p>
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
                  {selected.name} · {target}
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
                              placeholder="반려 사유"
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
                          <button className="btn" type="submit">
                            삭제
                          </button>
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
