import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const STATUS_BADGE: Record<string, string> = {
  운영: "green",
  모집중: "blue",
  마감: "orange",
  종료: "gray",
};

export default async function ClassesPage() {
  const supabase = await createClient();
  const { data: classes, error } = await supabase
    .from("classes")
    .select("id, name, sport, level, capacity, coach, schedule, status")
    .order("created_at", { ascending: false });

  const list = classes ?? [];

  // 클래스별 학생 수
  const { data: students } = await supabase
    .from("students")
    .select("class_id");
  const countByClass = new Map<string, number>();
  for (const s of students ?? []) {
    if (s.class_id)
      countByClass.set(s.class_id, (countByClass.get(s.class_id) ?? 0) + 1);
  }

  return (
    <>
      <div className="page-head">
        <div>
          <h1>클래스 관리</h1>
          <p className="subtext">실제 DB 연동 · 학생 등록의 수강 클래스 드롭다운에 연결됨</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/classes/new">
            클래스 생성
          </Link>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 클래스</span>
          <strong>{list.length}</strong>
        </div>
        <div className="summary-card">
          <span>운영중</span>
          <strong>{list.filter((c) => c.status === "운영").length}</strong>
        </div>
        <div className="summary-card">
          <span>모집중</span>
          <strong>{list.filter((c) => c.status === "모집중").length}</strong>
        </div>
        <div className="summary-card">
          <span>배정 학생</span>
          <strong>
            {[...countByClass.values()].reduce((a, b) => a + b, 0)}
          </strong>
        </div>
        <div className="summary-card">
          <span>종료</span>
          <strong>{list.filter((c) => c.status === "종료").length}</strong>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">클래스 목록</p>
        </div>

        {error && (
          <div className="panel-body">
            <div className="field-error-text">
              목록을 불러오지 못했습니다: {error.message}
            </div>
          </div>
        )}

        <table className="class-table">
          <thead>
            <tr>
              <th>클래스명</th>
              <th>종목</th>
              <th>레벨</th>
              <th>일정</th>
              <th>코치</th>
              <th>정원</th>
              <th>수강생</th>
              <th>상태</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id} className="row-link-host">
                <td>
                  <Link
                    href={`/admin/classes/${c.id}/edit`}
                    className="row-link-stretch"
                    style={{ fontWeight: 900, color: "var(--text)" }}
                  >
                    {c.name}
                  </Link>
                </td>
                <td className="muted">{c.sport ?? "-"}</td>
                <td className="muted">{c.level ?? "-"}</td>
                <td className="muted">{c.schedule ?? "-"}</td>
                <td className="muted">{c.coach ?? "-"}</td>
                <td className="muted">{c.capacity ?? "-"}</td>
                <td>
                  <span className="badge gray">
                    {countByClass.get(c.id) ?? 0}명
                  </span>
                </td>
                <td>
                  <span className={`badge ${STATUS_BADGE[c.status] ?? "gray"}`}>
                    {c.status}
                  </span>
                </td>
                <td>
                  <Link
                    className="btn"
                    style={{ minHeight: 30, padding: "4px 10px" }}
                    href={`/admin/classes/${c.id}/edit`}
                  >
                    수정
                  </Link>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={9}>
                  <div className="empty-state">
                    <strong>등록된 클래스가 없습니다</strong>
                    <p>
                      “클래스 생성”으로 첫 클래스를 만들면, 학생 등록 화면의
                      수강 클래스 드롭다운에 자동으로 나타납니다.
                    </p>
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
