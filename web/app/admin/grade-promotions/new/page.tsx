import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createGradePromotion } from "../actions";

const GRADE_OPTIONS = [
  "5세", "6세", "7세",
  "초1", "초2", "초3", "초4", "초5", "초6",
  "중1", "중2", "중3",
];

export default async function NewGradePromotionPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, name, grade, school")
    .order("name");

  const list = students ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>승급 등록</h1>
          <p className="subtext">
            <Link
              href="/admin/grade-promotions"
              style={{ color: "var(--muted)" }}
            >
              ← 진학/학년 승급 관리
            </Link>
          </p>
        </div>
      </div>

      <form action={createGradePromotion}>
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">승급 대상 등록</p>
            <span className="badge blue">필수</span>
          </div>
          <div className="panel-body">
            <div className="form-grid">
              <div className="field span-2">
                <label>학생 *</label>
                <select name="student_id" required defaultValue="">
                  <option value="" disabled>
                    학생 선택
                  </option>
                  {list.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.school ? ` · ${s.school}` : ""}
                      {s.grade ? ` · 현재 ${s.grade}` : ""}
                    </option>
                  ))}
                </select>
                {list.length === 0 && (
                  <span className="muted">
                    등록된 학생이 없습니다 — 회원 관리에서 먼저 등록하세요.
                  </span>
                )}
              </div>
              <div className="field">
                <label>학년도</label>
                <select name="school_year" defaultValue="2026학년도">
                  <option>2026학년도</option>
                  <option>2027학년도</option>
                </select>
              </div>
              <div className="field">
                <label>승급 후 학년</label>
                <select name="to_grade" defaultValue="">
                  <option value="">미선택</option>
                  {GRADE_OPTIONS.map((g) => (
                    <option key={g}>{g}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label>유형</label>
                <select name="promo_type" defaultValue="일반 승급">
                  <option>일반 승급</option>
                  <option>초등→중등</option>
                  <option>중등→고등</option>
                </select>
              </div>
              <div className="field">
                <label>현재 학년</label>
                <input disabled placeholder="선택한 학생 기준 자동" />
              </div>
              <div className="field span-2">
                <label>메모</label>
                <textarea name="note" placeholder="진학 확인 사항 등" />
              </div>
            </div>

            <div className="detail-actions">
              <a className="btn" href="/admin/grade-promotions">
                취소
              </a>
              <button type="submit" className="btn primary">
                등록
              </button>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
