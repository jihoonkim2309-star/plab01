import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { nextGrade, promoMeta } from "@/lib/promotion";
import { bulkCreateGradePromotions } from "../actions";

export default async function BulkNewPage() {
  const supabase = await createClient();
  const { data: students } = await supabase
    .from("students")
    .select("id, name, school, grade")
    .order("name");

  const list = students ?? [];

  return (
    <>
      <div className="page-head">
        <div>
          <h1>승급 대상 일괄 생성</h1>
          <p className="subtext">
            <Link href="/admin/grade-promotions" style={{ color: "var(--muted)" }}>
              ← 진학/학년 승급 관리
            </Link>
          </p>
        </div>
      </div>

      <form action={bulkCreateGradePromotions}>
        <div className="panel elevated">
          <div className="panel-head">
            <p className="panel-title">대상 학생 선택</p>
            <div className="toolbar">
              <select name="school_year" defaultValue="2026학년도">
                <option>2026학년도</option>
                <option>2027학년도</option>
              </select>
              <button className="btn primary">선택 학생 일괄 생성</button>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th className="check-cell"></th>
                <th>학생</th>
                <th>현재 학교/학년</th>
                <th>승급 후(자동)</th>
                <th>유형</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => {
                const to = nextGrade(s.grade);
                const meta = promoMeta(to);
                return (
                  <tr key={s.id}>
                    <td className="check-cell">
                      <input
                        type="checkbox"
                        name="student_ids"
                        value={s.id}
                        defaultChecked={!!to}
                        disabled={!to}
                      />
                    </td>
                    <td>
                      <strong>{s.name}</strong>
                    </td>
                    <td className="muted">
                      {[s.school, s.grade].filter(Boolean).join(" ") || "-"}
                    </td>
                    <td>
                      {to ? (
                        <strong>{to}</strong>
                      ) : (
                        <span className="muted">졸업/대상 아님</span>
                      )}
                    </td>
                    <td>
                      {to ? (
                        <span
                          className={`badge ${meta.needsParentInput ? "blue" : "gray"}`}
                        >
                          {meta.type}
                          {meta.needsParentInput ? " · 학교변경" : ""}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                );
              })}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
                    <div className="empty-state">
                      <strong>학생이 없습니다</strong>
                      <p>회원 관리에서 학생을 먼저 등록하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="muted" style={{ marginTop: 10 }}>
          학교 변경 유형(초등 입학·초등→중등·중등→고등)은 “학부모 입력 요청”
          상태로 생성됩니다. 학부모 앱 단계 전까지는 상세에서 관리자가 새 학교를
          대행 입력할 수 있습니다.
        </p>
      </form>
    </>
  );
}
