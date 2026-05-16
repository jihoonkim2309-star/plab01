import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { setGradePromotionStatus, deleteGradePromotion } from "./actions";

type GP = {
  id: string;
  school_year: string | null;
  from_grade: string | null;
  to_grade: string | null;
  promo_type: string | null;
  status: string;
  note: string | null;
  processed_at: string | null;
  student_id: string;
  students: { name: string; school: string | null } | null;
};

const STATUS_BADGE: Record<string, string> = {
  "진학 확인 필요": "orange",
  "학부모 입력 요청": "blue",
  "승인 완료": "green",
  보류: "gray",
};

const STATUSES = ["진학 확인 필요", "학부모 입력 요청", "승인 완료", "보류"];

export default async function GradePromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sel?: string }>;
}) {
  const { sel } = await searchParams;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("grade_promotions")
    .select(
      "id, school_year, from_grade, to_grade, promo_type, status, note, processed_at, student_id, students(name, school)",
    )
    .order("created_at", { ascending: false });

  const list = (data ?? []) as unknown as GP[];
  const count = (s: string) => list.filter((g) => g.status === s).length;
  const selected = sel ? list.find((g) => g.id === sel) ?? null : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>진학/학년 승급 관리</h1>
          <p className="subtext">학생 학년 승급 검토 · 승인 시 학생 학년에 실제 반영</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/grade-promotions/new">
            승급 등록
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>승급 대상</span>
          <strong>{list.length}</strong>
        </div>
        <div className="summary-card">
          <span>진학 확인</span>
          <strong>{count("진학 확인 필요")}</strong>
        </div>
        <div className="summary-card">
          <span>학부모 입력</span>
          <strong>{count("학부모 입력 요청")}</strong>
        </div>
        <div className="summary-card">
          <span>승인 완료</span>
          <strong>{count("승인 완료")}</strong>
        </div>
        <div className="summary-card">
          <span>보류</span>
          <strong>{count("보류")}</strong>
        </div>
      </div>

      <div className="grid account-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">승급 대상 목록</p>
          </div>
          {error && (
            <div className="panel-body">
              <div className="field-error-text">{error.message}</div>
            </div>
          )}
          <table>
            <thead>
              <tr>
                <th>학생</th>
                <th>현재</th>
                <th>승급 후</th>
                <th>유형</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr key={g.id} className={g.id === sel ? "selected" : ""}>
                  <td>
                    <Link
                      href={`/admin/grade-promotions?sel=${g.id}`}
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {g.students?.name ?? "-"}
                    </Link>
                    <div className="muted">{g.students?.school ?? ""}</div>
                  </td>
                  <td className="muted">{g.from_grade ?? "-"}</td>
                  <td className="muted">{g.to_grade ?? "-"}</td>
                  <td className="muted">{g.promo_type ?? "-"}</td>
                  <td>
                    <span className={`badge ${STATUS_BADGE[g.status] ?? "gray"}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <strong>승급 대상이 없습니다</strong>
                      <p>“승급 등록”으로 대상을 추가하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">승급 상세/처리</p>
            {selected && (
              <span
                className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}
              >
                {selected.status}
              </span>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 승급 대상이 없습니다</strong>
                <p>왼쪽 목록에서 학생을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">{selected.students?.name}</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>학교</span>
                      <strong>{selected.students?.school ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>현재 학년</span>
                      <strong>{selected.from_grade ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>승급 후</span>
                      <strong>{selected.to_grade ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>유형</span>
                      <strong>{selected.promo_type ?? "-"}</strong>
                    </div>
                    <div className="info-row">
                      <span>학년도</span>
                      <strong>{selected.school_year ?? "-"}</strong>
                    </div>
                  </div>
                </div>

                {selected.note && (
                  <div className="detail-block">
                    <p className="detail-title">메모</p>
                    <div
                      className="approval-note"
                      style={{ whiteSpace: "pre-wrap" }}
                    >
                      {selected.note}
                    </div>
                  </div>
                )}

                <div className="detail-block">
                  <p className="detail-title">상태 처리</p>
                  <div className="action-grid">
                    {STATUSES.map((st) => (
                      <form
                        key={st}
                        action={setGradePromotionStatus.bind(
                          null,
                          selected.id,
                          st,
                        )}
                      >
                        <button
                          className={`btn${st === "승인 완료" ? " primary" : st === "보류" ? " warn" : ""}`}
                          style={{ width: "100%" }}
                          disabled={selected.status === st}
                        >
                          {st}
                          {st === "승인 완료" ? " (학년 반영)" : ""}
                        </button>
                      </form>
                    ))}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <form action={deleteGradePromotion.bind(null, selected.id)}>
                      <button className="btn danger" style={{ width: "100%" }}>
                        삭제
                      </button>
                    </form>
                  </div>
                  {selected.processed_at && (
                    <div className="muted" style={{ marginTop: 8 }}>
                      최근 처리: {selected.processed_at.slice(0, 10)}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
