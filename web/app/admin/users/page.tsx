import Link from "next/link";
import { requireSuperAdmin } from "@/lib/center";
import FilterBar from "../FilterBar";
import StatusChips from "../StatusChips";
import SearchInput from "../SearchInput";
import ConfirmButton from "../ConfirmButton";
import { sendResetLink } from "./actions";

const ROLE_BADGE: Record<string, string> = {
  super_admin: "brand",
  admin: "blue",
  coach: "green",
  driver: "orange",
  parent: "gray",
  student: "gray",
};

const ROLE_LABEL: Record<string, string> = {
  super_admin: "슈퍼어드민",
  admin: "지점장",
  coach: "코치",
  driver: "기사",
  parent: "학부모",
  student: "학생",
};

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { q, role } = await searchParams;
  const { supabase } = await requireSuperAdmin();

  let listQuery = supabase
    .from("users")
    .select("id, email, name, phone, role, center_id, centers(name), created_at")
    .not("role", "is", null)
    .order("created_at", { ascending: false });
  if (role) listQuery = listQuery.eq("role", role);
  if (q) listQuery = listQuery.or(`name.ilike.%${q}%,email.ilike.%${q}%`);

  const [listRes, allRes] = await Promise.all([
    listQuery,
    supabase.from("users").select("role").not("role", "is", null),
  ]);

  type Row = {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
    role: string | null;
    center_id: string | null;
    centers: { name: string } | null;
    created_at: string | null;
  };
  const list = (listRes.data ?? []) as unknown as Row[];
  const all = (allRes.data ?? []) as { role: string }[];
  const totals = {
    total: all.length,
    admin: all.filter((u) => u.role === "admin").length,
    coach: all.filter((u) => u.role === "coach").length,
    driver: all.filter((u) => u.role === "driver").length,
    parent: all.filter((u) => u.role === "parent").length,
    student: all.filter((u) => u.role === "student").length,
  };
  const hasFilter = !!(q || role);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>사용자 관리</h1>
          <p className="subtext">
            전체 사용자 비밀번호 초기화 — 대상 이메일로 재설정 링크가 발송됩니다 (슈퍼 어드민 전용)
          </p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card"><span>전체</span><strong>{totals.total}</strong></div>
        <div className="summary-card"><span>지점장</span><strong>{totals.admin}</strong></div>
        <div className="summary-card"><span>코치</span><strong>{totals.coach}</strong></div>
        <div className="summary-card"><span>기사</span><strong>{totals.driver}</strong></div>
        <div className="summary-card"><span>학부모</span><strong>{totals.parent}</strong></div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">
            사용자 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {hasFilter
                ? `검색결과 ${list.length}건 / 전체 ${totals.total}`
                : `${list.length}건`}
            </span>
          </p>
        </div>

        <div className="panel-body" style={{ paddingBottom: 0 }}>
          <FilterBar>
            <StatusChips
              param="role"
              current={role}
              options={[
                { value: "super_admin", label: "슈퍼어드민" },
                { value: "admin", label: "지점장" },
                { value: "coach", label: "코치" },
                { value: "driver", label: "기사" },
                { value: "parent", label: "학부모" },
                { value: "student", label: "학생" },
              ]}
            />
            <div style={{ flex: 1 }} />
            <SearchInput param="q" current={q} placeholder="이름·이메일 검색" />
            {hasFilter && (
              <Link className="btn" href="/admin/users">
                초기화
              </Link>
            )}
          </FilterBar>
        </div>

        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>연락처</th>
              <th>역할</th>
              <th>지점</th>
              <th style={{ width: 160 }}>비밀번호</th>
            </tr>
          </thead>
          <tbody>
            {list.map((u) => (
              <tr key={u.id}>
                <td><strong>{u.name ?? "-"}</strong></td>
                <td className="muted">{u.email ?? "-"}</td>
                <td className="muted">{u.phone ?? "-"}</td>
                <td>
                  <span className={`badge ${ROLE_BADGE[u.role ?? ""] ?? "gray"}`}>
                    {ROLE_LABEL[u.role ?? ""] ?? u.role}
                  </span>
                </td>
                <td className="muted">{u.centers?.name ?? "-"}</td>
                <td>
                  {u.email ? (
                    <form action={sendResetLink.bind(null, u.email)}>
                      <ConfirmButton
                        message={`${u.name ?? u.email} 의 이메일(${u.email})로 비밀번호 재설정 링크를 보낼까요?`}
                        className="btn"
                        style={{ minHeight: 30, padding: "4px 10px" }}
                        type="submit"
                      >
                        재설정 링크 발송
                      </ConfirmButton>
                    </form>
                  ) : (
                    <span className="muted" style={{ fontSize: 12 }}>이메일 없음</span>
                  )}
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    {hasFilter ? (
                      <>
                        <strong>검색 결과가 없습니다</strong>
                        <p>필터·검색어를 조정해 보세요.</p>
                      </>
                    ) : (
                      <>
                        <strong>승인된 사용자가 없습니다</strong>
                      </>
                    )}
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
