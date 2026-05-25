import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ConfirmButton from "../ConfirmButton";
import PhoneInput from "../PhoneInput";
import AddressField from "../AddressField";
import { createCenter, deleteCenter, updateCenter } from "./actions";

export default async function CentersPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; error?: string; edit?: string }>;
}) {
  const { saved, error, edit } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin") {
    return (
      <div className="page-head">
        <h1>접근 불가</h1>
        <p className="subtext">슈퍼 어드민만 지점을 관리할 수 있습니다.</p>
      </div>
    );
  }

  const { data: centers } = await supabase
    .from("centers")
    .select(
      "id, name, contact_phone, address, billing_day, report_day, created_at",
    )
    .order("created_at", { ascending: true });

  // 각 지점별 admin/coach/학생 카운트
  const [usersRes, studentsRes] = await Promise.all([
    supabase
      .from("users")
      .select("center_id, role")
      .in("role", ["admin", "coach"]),
    supabase.from("students").select("center_id, status"),
  ]);
  const adminCount = new Map<string, number>();
  const coachCount = new Map<string, number>();
  for (const u of usersRes.data ?? []) {
    if (!u.center_id) continue;
    const m = u.role === "admin" ? adminCount : coachCount;
    m.set(u.center_id, (m.get(u.center_id) ?? 0) + 1);
  }
  const studentActiveCount = new Map<string, number>();
  for (const s of studentsRes.data ?? []) {
    if (!s.center_id || s.status !== "활성") continue;
    studentActiveCount.set(
      s.center_id,
      (studentActiveCount.get(s.center_id) ?? 0) + 1,
    );
  }

  const list = centers ?? [];
  const editing = edit ? list.find((c) => c.id === edit) ?? null : null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>지점 관리</h1>
          <p className="subtext">
            프랜차이즈 지점 개설·수정·삭제 (슈퍼 어드민 전용)
          </p>
        </div>
      </div>

      {saved && (
        <div className="panel" style={banner("green")}>
          저장되었습니다.
        </div>
      )}
      {error && (
        <div className="panel" style={banner("red")}>
          {error}
        </div>
      )}

      <div className="member-summary">
        <div className="summary-card">
          <span>전체 지점</span>
          <strong>{list.length}</strong>
        </div>
        <div className="summary-card">
          <span>전체 관리자</span>
          <strong>{[...adminCount.values()].reduce((a, b) => a + b, 0)}</strong>
        </div>
        <div className="summary-card">
          <span>전체 코치</span>
          <strong>{[...coachCount.values()].reduce((a, b) => a + b, 0)}</strong>
        </div>
        <div className="summary-card">
          <span>활성 학생</span>
          <strong>
            {[...studentActiveCount.values()].reduce((a, b) => a + b, 0)}
          </strong>
        </div>
      </div>

      {/* 새 지점 개설 / 수정 폼 */}
      <form
        action={editing ? updateCenter : createCenter}
        className="panel elevated"
      >
        <div className="panel-head">
          <p className="panel-title">
            {editing ? `지점 수정 — ${editing.name}` : "지점 개설"}
          </p>
        </div>
        <div className="panel-body">
          {editing && <input type="hidden" name="id" value={editing.id} />}
          <div className="form-grid">
            <div className="field">
              <label>지점명 *</label>
              <input
                name="name"
                defaultValue={editing?.name ?? ""}
                placeholder="플랜비 본점"
                required
              />
            </div>
            <div className="field">
              <label>대표 연락처</label>
              <PhoneInput
                name="contact_phone"
                defaultValue={editing?.contact_phone ?? ""}
              />
            </div>
            <div className="field span-2">
              <label>주소</label>
              <AddressField
                name="address"
                defaultValue={editing?.address ?? ""}
              />
            </div>
            <div className="field">
              <label>결제일 (매월 N일, 1~28)</label>
              <input
                name="billing_day"
                type="number"
                min={1}
                max={28}
                defaultValue={editing?.billing_day ?? 10}
              />
            </div>
            <div className="field">
              <label>리포트 발행일 (매월 N일, 1~28)</label>
              <input
                name="report_day"
                type="number"
                min={1}
                max={28}
                defaultValue={editing?.report_day ?? 1}
              />
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn primary" type="submit">
              {editing ? "변경 저장" : "지점 개설"}
            </button>
            {editing && (
              <a className="btn" href="/admin/centers">
                취소
              </a>
            )}
          </div>
        </div>
      </form>

      {/* 지점 목록 */}
      <div className="panel elevated" style={{ marginTop: 14 }}>
        <div className="panel-head">
          <p className="panel-title">
            지점 목록{" "}
            <span className="muted" style={{ fontSize: 12, fontWeight: 400 }}>
              {list.length}개
            </span>
          </p>
        </div>
        <table>
          <thead>
            <tr>
              <th>지점명</th>
              <th>연락처</th>
              <th>결제일/리포트일</th>
              <th>관리자/코치/학생</th>
              <th>개설일</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <tr key={c.id}>
                <td>
                  <strong>{c.name}</strong>
                  {c.address && (
                    <div className="muted" style={{ fontSize: 12 }}>
                      {c.address}
                    </div>
                  )}
                </td>
                <td className="muted">{c.contact_phone ?? "-"}</td>
                <td className="muted">
                  매월 {c.billing_day}일 / {c.report_day}일
                </td>
                <td className="muted">
                  {adminCount.get(c.id) ?? 0} / {coachCount.get(c.id) ?? 0} /{" "}
                  {studentActiveCount.get(c.id) ?? 0}
                </td>
                <td className="muted">{c.created_at?.slice(0, 10) ?? "-"}</td>
                <td>
                  <div
                    style={{
                      display: "flex",
                      gap: 6,
                      justifyContent: "flex-end",
                    }}
                  >
                    <a
                      className="btn"
                      href={`/admin/centers?edit=${c.id}`}
                      style={{ minHeight: 30, padding: "4px 10px" }}
                    >
                      수정
                    </a>
                    <form action={deleteCenter}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton
                        message={`'${c.name}' 지점을 삭제할까요? 소속 학생·클래스·결제·계정도 함께 삭제됩니다. 되돌릴 수 없습니다.`}
                        className="btn danger"
                        type="submit"
                        style={{ minHeight: 30, padding: "4px 10px" }}
                      >
                        삭제
                      </ConfirmButton>
                    </form>
                  </div>
                </td>
              </tr>
            ))}
            {list.length === 0 && (
              <tr>
                <td colSpan={6}>
                  <div className="empty-state">
                    <strong>등록된 지점이 없습니다</strong>
                    <p>위 폼으로 첫 지점을 개설하세요.</p>
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

function banner(tone: "green" | "red") {
  if (tone === "green") {
    return {
      background: "var(--green-soft)",
      borderColor: "#b8dccb",
      color: "var(--green)",
      padding: "12px 16px",
    } as const;
  }
  return {
    background: "var(--red-soft, #fdecec)",
    borderColor: "#f3b1b1",
    color: "var(--red)",
    padding: "12px 16px",
  } as const;
}
