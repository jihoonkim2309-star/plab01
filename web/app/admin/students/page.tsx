import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, string> = {
  활성: "green",
  상담중: "blue",
  대기: "orange",
  휴면: "gray",
};

export default async function StudentsPage() {
  const supabase = await createClient();
  const { data: students, error } = await supabase
    .from("students")
    .select("id, name, gender, school, grade, status, class_name, shuttle_use")
    .order("created_at", { ascending: false });

  const list = students ?? [];
  const active = list.filter((s) => s.status === "활성").length;
  const shuttle = list.filter((s) => s.shuttle_use === "이용").length;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>회원 관리</h1>
          <p className="subtext">학생 목록 · 실제 DB 연동</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/students/new">
            학생 등록
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 회원</span>
          <strong>{list.length}</strong>
        </div>
        <div className="summary-card">
          <span>활성 회원</span>
          <strong>{active}</strong>
        </div>
        <div className="summary-card">
          <span>셔틀 이용</span>
          <strong>{shuttle}</strong>
        </div>
        <div className="summary-card">
          <span>상담중</span>
          <strong>{list.filter((s) => s.status === "상담중").length}</strong>
        </div>
        <div className="summary-card">
          <span>휴면</span>
          <strong>{list.filter((s) => s.status === "휴면").length}</strong>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">학생 목록</p>
        </div>

        {error && (
          <div className="panel-body">
            <div className="field-error-text">
              목록을 불러오지 못했습니다: {error.message}
            </div>
          </div>
        )}

        <table className="member-table">
          <thead>
            <tr>
              <th>이름</th>
              <th>성별</th>
              <th>학교</th>
              <th>학년</th>
              <th>클래스</th>
              <th>셔틀</th>
              <th>상태</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id}>
                <td>
                  <Link
                    href={`/admin/students/${s.id}`}
                    style={{ fontWeight: 900, color: "var(--text)" }}
                  >
                    {s.name}
                  </Link>
                </td>
                <td className="muted">{s.gender}</td>
                <td className="muted">{s.school ?? "-"}</td>
                <td className="muted">{s.grade ?? "-"}</td>
                <td className="muted">{s.class_name ?? "-"}</td>
                <td>
                  {s.shuttle_use === "이용" ? (
                    <span className="badge green">이용</span>
                  ) : (
                    <span className="badge gray">미이용</span>
                  )}
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[s.status] ?? "gray"}`}>
                    {s.status}
                  </span>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>등록된 학생이 없습니다</strong>
                    <p>우측 상단 “학생 등록”으로 첫 학생을 추가하세요.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
