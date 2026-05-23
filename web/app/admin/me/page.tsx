import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { updateMyProfile, changeMyPassword } from "./actions";

const ROLE_LABEL: Record<string, string> = {
  admin: "관리자",
  coach: "코치",
  parent: "학부모",
  student: "학생",
  driver: "기사",
};

export default async function MyProfilePage({
  searchParams,
}: {
  searchParams: Promise<{
    saved?: string;
    error?: string;
    psaved?: string;
    perror?: string;
  }>;
}) {
  const { saved, error, psaved, perror } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, email, phone, role, center_id, created_at")
    .eq("id", user.id)
    .single();

  const { data: center } = profile?.center_id
    ? await supabase
        .from("centers")
        .select("name")
        .eq("id", profile.center_id)
        .single()
    : { data: null };

  const p = profile as {
    name: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    center_id: string | null;
    created_at: string | null;
  } | null;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>내 프로필</h1>
          <p className="subtext">
            로그인 계정 정보 · 이름·연락처·비밀번호 변경
          </p>
        </div>
      </div>

      {saved && (
        <div className="panel" style={banner("green")}>
          프로필이 저장되었습니다.
        </div>
      )}
      {error && (
        <div className="panel" style={banner("red")}>{error}</div>
      )}

      <form action={updateMyProfile} className="panel">
        <div className="panel-head">
          <p className="panel-title">기본 정보</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>이름 *</label>
              <input
                name="name"
                defaultValue={p?.name ?? ""}
                placeholder="홍길동"
                required
              />
            </div>
            <div className="field">
              <label>연락처</label>
              <input
                name="phone"
                defaultValue={p?.phone ?? ""}
                placeholder="010-0000-0000"
                inputMode="tel"
              />
            </div>
            <div className="field">
              <label>이메일</label>
              <input value={p?.email ?? user.email ?? ""} disabled />
              <small className="muted">
                이메일 변경은 별도 인증이 필요합니다.
              </small>
            </div>
            <div className="field">
              <label>역할</label>
              <input
                value={ROLE_LABEL[p?.role ?? ""] ?? p?.role ?? "-"}
                disabled
              />
            </div>
            <div className="field">
              <label>소속 센터</label>
              <input value={center?.name ?? "-"} disabled />
            </div>
            <div className="field">
              <label>가입일</label>
              <input value={p?.created_at?.slice(0, 10) ?? "-"} disabled />
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn primary" type="submit">
              저장
            </button>
          </div>
        </div>
      </form>

      {psaved && (
        <div className="panel" style={{ ...banner("green"), marginTop: 14 }}>
          비밀번호가 변경되었습니다. 다음 로그인부터 적용됩니다.
        </div>
      )}
      {perror && (
        <div className="panel" style={{ ...banner("red"), marginTop: 14 }}>
          {perror}
        </div>
      )}

      <form
        action={changeMyPassword}
        className="panel"
        style={{ marginTop: 14 }}
      >
        <div className="panel-head">
          <p className="panel-title">비밀번호 변경</p>
        </div>
        <div className="panel-body">
          <div className="form-grid">
            <div className="field">
              <label>새 비밀번호 (6자 이상)</label>
              <input
                name="new_password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
            <div className="field">
              <label>새 비밀번호 확인</label>
              <input
                name="confirm_password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
              />
            </div>
          </div>
          <div className="detail-actions">
            <button className="btn primary" type="submit">
              비밀번호 변경
            </button>
          </div>
        </div>
      </form>
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
