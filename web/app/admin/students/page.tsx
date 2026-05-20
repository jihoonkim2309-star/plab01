import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { deleteStudent } from "./actions";
import ConfirmButton from "../ConfirmButton";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";

const STATUS_BADGE: Record<string, string> = {
  활성: "green",
  상담중: "blue",
  대기: "orange",
  휴면: "gray",
};

const BASIC: [string, string][] = [
  ["성별", "gender"],
  ["생년월일", "birth"],
  ["학교", "school"],
  ["학년", "grade"],
  ["주 종목", "sport"],
  ["레벨", "level"],
];

const ENROLL: [string, string][] = [
  ["수강 클래스", "class_name"],
  ["결제 상품", "product"],
  ["셔틀 이용", "shuttle_use"],
  ["노선", "route"],
];

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{
    student?: string;
    q?: string;
    status?: string;
    shuttle?: string;
  }>;
}) {
  const { student: selectedId, q, status, shuttle: shuttleFilter } =
    await searchParams;
  const supabase = await createClient();

  // 검색·필터 적용한 목록 + 선택된 학생 상세를 병렬로 조회
  let listQuery = supabase
    .from("students")
    .select(
      "id, name, gender, school, grade, status, class_name, shuttle_use, photo_url",
    )
    .order("created_at", { ascending: false });
  if (q) {
    listQuery = listQuery.or(`name.ilike.%${q}%,school.ilike.%${q}%`);
  }
  if (status) listQuery = listQuery.eq("status", status);
  if (shuttleFilter === "이용") listQuery = listQuery.eq("shuttle_use", "이용");
  else if (shuttleFilter === "미이용")
    listQuery = listQuery.or("shuttle_use.is.null,shuttle_use.neq.이용");

  const [listRes, selectedRes] = await Promise.all([
    listQuery,
    selectedId
      ? supabase.from("students").select("*").eq("id", selectedId).single()
      : Promise.resolve({ data: null }),
  ]);
  const { data: students, error } = listRes;
  const list = students ?? [];
  const active = list.filter((s) => s.status === "활성").length;
  const shuttle = list.filter((s) => s.shuttle_use === "이용").length;
  const selected = selectedRes.data;
  const hasActiveFilter = !!(q || status || shuttleFilter);

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

      <div className="grid member-layout">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">학생 목록</p>
          </div>

          <div className="panel-body" style={{ paddingBottom: 0 }}>
            <FilterBar>
              <StatusChips
                param="status"
                current={status}
                options={[
                  { value: "활성", label: "활성" },
                  { value: "상담중", label: "상담중" },
                  { value: "대기", label: "대기" },
                  { value: "휴면", label: "휴면" },
                ]}
              />
              <StatusChips
                param="shuttle"
                current={shuttleFilter}
                allLabel="셔틀 전체"
                options={[
                  { value: "이용", label: "이용" },
                  { value: "미이용", label: "미이용" },
                ]}
              />
              <div style={{ flex: 1 }} />
              <SearchInput param="q" current={q} placeholder="이름·학교 검색" />
              {hasActiveFilter && (
                <Link className="btn" href="/admin/students">
                  초기화
                </Link>
              )}
            </FilterBar>
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
                <th>학교/학년</th>
                <th>클래스</th>
                <th>셔틀</th>
                <th>상태</th>
              </tr>
            </thead>
            <tbody>
              {list.map((s) => (
                <tr
                  key={s.id}
                  className={`row-link-host ${s.id === selectedId ? "selected" : ""}`}
                >
                  <td>
                    <Link
                      href={`/admin/students?student=${s.id}`}
                      className="row-link-stretch"
                      style={{ fontWeight: 900, color: "var(--text)" }}
                    >
                      {s.name}
                    </Link>
                  </td>
                  <td className="muted">
                    {[s.school, s.grade].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="muted">{s.class_name ?? "-"}</td>
                  <td>
                    {s.shuttle_use === "이용" ? (
                      <span className="badge green">이용</span>
                    ) : (
                      <span className="badge gray">미이용</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${STATUS_BADGE[s.status] ?? "gray"}`}
                    >
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))}
              {list.length === 0 && (
                <tr>
                  <td colSpan={5}>
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

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">학생 상세</p>
            {selected && (
              <div className="toolbar">
                <Link
                  className="btn primary"
                  href={`/admin/students/${selected.id}/edit?from=${encodeURIComponent(`/admin/students?student=${selected.id}`)}`}
                >
                  수정
                </Link>
                <form action={deleteStudent.bind(null, selected.id)}>
                  <ConfirmButton
                    message={`'${selected.name ?? "학생"}'을(를) 삭제할까요? 되돌릴 수 없습니다.`}
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
                <strong>선택된 학생이 없습니다</strong>
                <p>왼쪽 목록에서 학생을 선택해 주세요.</p>
              </div>
            ) : (
              <>
                <div className="profile-hero">
                  <div className="avatar">
                    {selected.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={selected.photo_url}
                        alt={selected.name ?? "학생 사진"}
                      />
                    ) : (
                      selected.name?.charAt(0)
                    )}
                  </div>
                  <div>
                    <strong style={{ fontSize: 20 }}>{selected.name}</strong>
                    <div className="muted">
                      {[
                        selected.class_name,
                        selected.product,
                        selected.shuttle_use === "이용" ? "셔틀 이용" : null,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "수강 정보 미입력"}
                    </div>
                    <div style={{ marginTop: 9 }}>
                      <span
                        className={`badge ${STATUS_BADGE[selected.status] ?? "gray"}`}
                      >
                        {selected.status}
                      </span>{" "}
                      <span className="badge gray">{selected.gender}</span>
                    </div>
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">기본 정보</p>
                  <div className="info-list">
                    {BASIC.map(([label, key]) => (
                      <div className="info-row" key={key}>
                        <span>{label}</span>
                        <strong>{selected[key] ?? "-"}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">수강 / 셔틀</p>
                  <div className="info-list">
                    {ENROLL.map(([label, key]) => (
                      <div className="info-row" key={key}>
                        <span>{label}</span>
                        <strong>{selected[key] ?? "-"}</strong>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">건강/주의사항</p>
                  <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                    {selected.caution || "-"}
                  </div>
                </div>

                <div className="detail-block">
                  <p className="detail-title">운영 메모</p>
                  <div className="approval-note" style={{ whiteSpace: "pre-wrap" }}>
                    {selected.memo || "-"}
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
