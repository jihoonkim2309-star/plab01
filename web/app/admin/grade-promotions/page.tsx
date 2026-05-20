import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import {
  bulkSetStatus,
  setGradePromotionStatus,
  updatePromotionDetail,
  deleteGradePromotion,
} from "./actions";
import ConfirmButton from "../ConfirmButton";

type GP = {
  id: string;
  school_year: string | null;
  from_grade: string | null;
  to_grade: string | null;
  promo_type: string | null;
  status: string;
  note: string | null;
  to_school: string | null;
  needs_parent_input: boolean;
  processed_at: string | null;
  student_id: string;
  students: { name: string; school: string | null } | null;
};

const SB: Record<string, string> = {
  "진학 확인 필요": "orange",
  "학부모 입력 요청": "blue",
  "승인 완료": "green",
  보류: "gray",
};

export default async function GradePromotionsPage({
  searchParams,
}: {
  searchParams: Promise<{ sel?: string }>;
}) {
  const { sel } = await searchParams;
  const supabase = await createClient();

  const { data } = await supabase
    .from("grade_promotions")
    .select(
      "id, school_year, from_grade, to_grade, promo_type, status, note, to_school, needs_parent_input, processed_at, student_id, students(name, school)",
    )
    .order("created_at", { ascending: false });

  const list = (data ?? []) as unknown as GP[];
  const c = (s: string) => list.filter((g) => g.status === s).length;
  const selected = sel ? list.find((g) => g.id === sel) ?? null : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>진학/학년 승급 관리</h1>
          <p className="subtext">
            매년 2~3월 일괄 처리 · 승인 시 학생 학년(학교변경 시 학교)에 실제 반영
          </p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/grade-promotions/new">
            승급 대상 일괄 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>승급 대상</span><strong>{list.length}</strong></div>
        <div className="summary-card"><span>진학 확인</span><strong>{c("진학 확인 필요")}</strong></div>
        <div className="summary-card"><span>학부모 입력</span><strong>{c("학부모 입력 요청")}</strong></div>
        <div className="summary-card"><span>승인 완료</span><strong>{c("승인 완료")}</strong></div>
        <div className="summary-card"><span>보류</span><strong>{c("보류")}</strong></div>
      </div>

      <div className="grid account-layout">
        <form action={bulkSetStatus} className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">승급 대상 목록</p>
            <div className="toolbar">
              <button className="btn primary" name="status" value="승인 완료">
                선택 승인 완료
              </button>
              <button className="btn warn" name="status" value="보류">
                선택 보류
              </button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th className="check-cell"></th>
                <th>학생</th>
                <th>현재</th>
                <th>승급 후</th>
                <th>유형</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((g) => (
                <tr
                  key={g.id}
                  className={`row-link-host ${g.id === sel ? "selected" : ""}`}
                >
                  <td className="check-cell">
                    <input type="checkbox" name="ids" value={g.id} />
                  </td>
                  <td>
                    <Link
                      href={`/admin/grade-promotions?sel=${g.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {g.students?.name ?? "-"}
                    </Link>
                    <div className="muted">{g.students?.school ?? ""}</div>
                  </td>
                  <td className="muted">{g.from_grade ?? "-"}</td>
                  <td className="muted">
                    {g.to_grade ?? "-"}
                    {g.needs_parent_input && (
                      <span className="badge blue" style={{ marginLeft: 6 }}>
                        학교변경
                      </span>
                    )}
                  </td>
                  <td className="muted">{g.promo_type ?? "-"}</td>
                  <td>
                    <span className={`badge ${SB[g.status] ?? "gray"}`}>
                      {g.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={6}>
                    <div className="empty-state">
                      <strong>승급 대상이 없습니다</strong>
                      <p>“승급 대상 일괄 생성”으로 대상을 만드세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </form>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">승급 상세/처리</p>
            {selected && (
              <span className={`badge ${SB[selected.status] ?? "gray"}`}>
                {selected.status}
              </span>
            )}
          </div>
          <div className="panel-body">
            {!selected ? (
              <div className="empty-state">
                <strong>선택된 승급 대상이 없습니다</strong>
                <p>왼쪽 목록에서 학생 이름을 클릭하세요.</p>
              </div>
            ) : (
              <>
                <div className="detail-block" style={{ marginTop: 0 }}>
                  <p className="detail-title">{selected.students?.name}</p>
                  <div className="info-list">
                    <div className="info-row">
                      <span>현재 학교/학년</span>
                      <strong>
                        {[selected.students?.school, selected.from_grade]
                          .filter(Boolean)
                          .join(" ") || "-"}
                      </strong>
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

                <form
                  action={updatePromotionDetail.bind(null, selected.id)}
                  className="detail-block"
                >
                  <p className="detail-title">
                    승급 정보 {selected.needs_parent_input ? "(학교 변경 — 학부모 입력 대상)" : ""}
                  </p>
                  <div className="form-grid">
                    <div className="field">
                      <label>승급 후 학년</label>
                      <input
                        name="to_grade"
                        defaultValue={selected.to_grade ?? ""}
                      />
                    </div>
                    <div className="field">
                      <label>새 학교 {selected.needs_parent_input ? "*" : "(해당 시)"}</label>
                      <input
                        name="to_school"
                        defaultValue={selected.to_school ?? ""}
                        placeholder={
                          selected.needs_parent_input
                            ? "예: 송도중학교 (학부모 앱 생기면 학부모가 입력)"
                            : "학교 변경 없으면 비움"
                        }
                      />
                    </div>
                    <div className="field span-2">
                      <label>메모</label>
                      <textarea name="note" defaultValue={selected.note ?? ""} />
                    </div>
                  </div>
                  <div className="detail-actions">
                    <button className="btn">저장 (관리자 대행 입력)</button>
                  </div>
                </form>

                <div className="detail-block">
                  <p className="detail-title">상태 처리</p>
                  <div className="action-grid">
                    {["진학 확인 필요", "학부모 입력 요청", "승인 완료", "보류"].map(
                      (st) => (
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
                            {st === "승인 완료" ? " (반영)" : ""}
                          </button>
                        </form>
                      ),
                    )}
                  </div>
                  <div style={{ marginTop: 10 }}>
                    <form
                      action={deleteGradePromotion.bind(null, selected.id)}
                    >
                      <ConfirmButton
                        message="이 진학 승급 건을 삭제할까요?"
                        className="btn danger"
                        style={{ width: "100%" }}
                        type="submit"
                      >
                        삭제
                      </ConfirmButton>
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
