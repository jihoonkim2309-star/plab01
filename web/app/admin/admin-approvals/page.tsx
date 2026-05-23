import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { approveAdmin, rejectAdmin } from "./actions";
import ConfirmButton from "../ConfirmButton";

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

  // pending = role 미부여. super_admin 은 전체, 일반 admin 은 자기 지점 신청자만 (RLS 도 이미 그렇게 잠금).
  let pendingQuery = supabase
    .from("users")
    .select("id, name, email, phone, applying_center_id, created_at")
    .is("role", null)
    .order("created_at", { ascending: false });
  if (!isSuper && me.center_id) {
    pendingQuery = pendingQuery.eq("applying_center_id", me.center_id);
  }

  const [pendingRes, centersRes] = await Promise.all([
    pendingQuery,
    supabase
      .from("centers")
      .select("id, name")
      .order("name", { ascending: true }),
  ]);

  const pending = pendingRes.data ?? [];
  const centers = (centersRes.data ?? []) as { id: string; name: string }[];
  const centerNameById = new Map(centers.map((c) => [c.id, c.name]));

  return (
    <>
      <div className="page-head">
        <div>
          <h1>어드민 가입 승인</h1>
          <p className="subtext">
            {isSuper
              ? "모든 지점의 가입 신청"
              : "내 지점으로 신청한 가입자"}{" "}
            · 승인 시 역할/지점이 부여되고 어드민 접근이 열립니다
          </p>
        </div>
      </div>

      <div className="member-summary">
        <div className="summary-card">
          <span>승인 대기</span>
          <strong>{pending.length}</strong>
        </div>
        <div className="summary-card">
          <span>전체 지점</span>
          <strong>{centers.length}</strong>
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
              <th>신청일</th>
              <th style={{ minWidth: 320 }}>처리</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((u) => {
              const applyingName = u.applying_center_id
                ? (centerNameById.get(u.applying_center_id) ?? "-")
                : "(미지정)";
              return (
                <tr key={u.id}>
                  <td>
                    <strong>{u.name ?? "-"}</strong>
                  </td>
                  <td className="muted">{u.email ?? "-"}</td>
                  <td className="muted">{u.phone ?? "-"}</td>
                  <td>{applyingName}</td>
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
                        defaultValue={
                          u.applying_center_id ??
                          (isSuper ? "" : (me.center_id ?? ""))
                        }
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
                        defaultValue="admin"
                        style={{ minHeight: 32, padding: "4px 8px" }}
                      >
                        <option value="admin">지점장 (admin)</option>
                        <option value="coach">코치 (coach)</option>
                      </select>
                      <button
                        className="btn primary"
                        type="submit"
                        style={{ minHeight: 32, padding: "4px 12px" }}
                      >
                        승인
                      </button>
                    </form>
                    <form action={rejectAdmin} style={{ marginTop: 6 }}>
                      <input type="hidden" name="user_id" value={u.id} />
                      <ConfirmButton
                        message={`'${u.name ?? u.email ?? "이 사용자"}'의 신청을 거절할까요? 사용자는 다시 신청 지점을 골라야 합니다.`}
                        className="btn danger"
                        type="submit"
                        style={{ minHeight: 28, padding: "2px 10px", fontSize: 12 }}
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
                <td colSpan={6}>
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
