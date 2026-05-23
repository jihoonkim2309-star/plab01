import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveAdmin, rejectAdmin } from "./actions";
import ConfirmButton from "../ConfirmButton";

const ROLE_LABEL: Record<string, string> = {
  admin: "지점장(admin)",
  coach: "코치",
  driver: "기사",
};

export default async function AdminApprovalsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin" && me?.role !== "admin") {
    return (
      <div className="page-head">
        <h1>접근 불가</h1>
        <p className="subtext">슈퍼 어드민 또는 지점장만 접근할 수 있습니다.</p>
      </div>
    );
  }
  const isSuper = me.role === "super_admin";

  // pending = role 미부여.
  // - super_admin: applying_role='admin' 신청만 (지점장 신청)
  // - admin: 자기 지점 + applying_role in ('coach','driver','admin') (직원 신청)
  let pendingQuery = supabase
    .from("users")
    .select("id, name, email, phone, applying_center_id, applying_role, created_at")
    .is("role", null)
    .order("created_at", { ascending: false });
  if (isSuper) {
    pendingQuery = pendingQuery.eq("applying_role", "admin");
  } else if (me.center_id) {
    pendingQuery = pendingQuery
      .eq("applying_center_id", me.center_id)
      .in("applying_role", ["admin", "coach", "driver"]);
  }

  const [pendingRes, centersRes] = await Promise.all([
    pendingQuery,
    supabase
      .from("centers")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  const pending = (pendingRes.data ?? []) as {
    id: string;
    name: string | null;
    email: string | null;
    phone: string | null;
    applying_center_id: string | null;
    applying_role: string | null;
    created_at: string | null;
  }[];
  const centers = (centersRes.data ?? []) as { id: string; name: string }[];
  const centerNameById = new Map(centers.map((c) => [c.id, c.name]));

  // 지점장 화면에선 역할별 직원만 노출되도록 안내 (super 와 admin 의 화면 헤더 분기)
  const subtitle = isSuper
    ? "각 지점의 지점장(admin) 가입 신청만 노출됩니다 · 코치·기사 신청은 해당 지점장이 처리"
    : "내 지점의 코치·기사·추가 관리자 신청 · 승인 시 신청 역할 그대로 부여";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{isSuper ? "지점장 가입 승인" : "지점 직원 가입 승인"}</h1>
          <p className="subtext">{subtitle}</p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>승인 대기</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="summary-card">
          <span>{isSuper ? "전체 지점" : "내 지점"}</span>
          <strong>
            {isSuper
              ? centers.length
              : (me.center_id ? centerNameById.get(me.center_id) ?? "-" : "-")}
          </strong>
        </div>
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <p className="panel-title">대기 목록</p>
        </div>
        <table>
          <thead>
            <tr>
              <th>이름</th>
              <th>이메일</th>
              <th>연락처</th>
              <th>신청 지점</th>
              <th>신청 역할</th>
              <th>신청일</th>
              <th style={{ minWidth: 340 }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((u) => {
              const applyingName = u.applying_center_id
                ? (centerNameById.get(u.applying_center_id) ?? "-")
                : "(미지정)";
              const applyingRoleLabel =
                u.applying_role ? (ROLE_LABEL[u.applying_role] ?? u.applying_role) : "(미지정)";
              // 일반 admin: 자기 지점 강제. 슈퍼: 지점은 신청대로 지점장만 부여.
              const defaultCenter =
                u.applying_center_id ?? (isSuper ? "" : (me.center_id ?? ""));
              const defaultRole = isSuper ? "admin" : (u.applying_role ?? "coach");

              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name ?? "-"}</strong>
                  </td>
                  <td className="muted">{u.email ?? "-"}</td>
                  <td className="muted">{u.phone ?? "-"}</td>
                  <td>{applyingName}</td>
                  <td>
                    <span className="badge gray">{applyingRoleLabel}</span>
                  </td>
                  <td className="muted">{u.created_at?.slice(0, 10) ?? "-"}</td>
                  <td>
                    <form
                      action={approveAdmin}
                      style={{
                        display: "flex",
                        gap: 6,
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <input type="hidden" name="user_id" value={u.id} />
                      <select
                        name="center_id"
                        defaultValue={defaultCenter}
                        required
                        disabled={!isSuper}
                        style={{ minHeight: 32, padding: "4px 8px" }}
                      >
                        {!isSuper && me.center_id ? (
                          <option value={me.center_id}>
                            {centerNameById.get(me.center_id) ?? "내 지점"}
                          </option>
                        ) : (
                          <>
                            <option value="">지점 선택</option>
                            {centers.map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </>
                        )}
                      </select>
                      <select
                        name="role"
                        defaultValue={defaultRole}
                        disabled={isSuper}
                        style={{ minHeight: 32, padding: "4px 8px" }}
                      >
                        {isSuper ? (
                          <option value="admin">지점장 (admin)</option>
                        ) : (
                          <>
                            <option value="admin">지점장 (admin)</option>
                            <option value="coach">코치</option>
                            <option value="driver">기사</option>
                          </>
                        )}
                      </select>
                      <button
                        className="btn primary"
                        type="submit"
                        style={{ minHeight: 32, padding: "4px 12px" }}
                      >
                        승인
                      </button>
                      <ConfirmButton
                        message={`'${u.name ?? u.email ?? "이 사용자"}'의 신청을 거절할까요? 사용자는 다시 신청해야 합니다.`}
                        className="btn danger"
                        type="submit"
                        formAction={rejectAdmin}
                        style={{ minHeight: 32, padding: "4px 12px" }}
                      >
                        거절
                      </ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
            {pending.length === 0 && (
              <tr>
                <td colSpan={7}>
                  <div className="empty-state">
                    <strong>대기 중인 신청이 없습니다</strong>
                    <p>
                      신규 가입은{" "}
                      <Link href="/login">로그인 페이지</Link>의 회원가입 폼을
                      통해 들어옵니다.
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
