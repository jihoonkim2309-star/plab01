import "./admin.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";
import GlobalLoading from "./GlobalLoading";
import SuppressInvalidTooltip from "./SuppressInvalidTooltip";
import ProfileMenu from "./ProfileMenu";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  // proxy.ts 미들웨어가 매 요청에서 이미 getUser()로 JWT 검증을 하므로
  // 레이아웃에선 로컬 쿠키 세션만 읽어 네트워크 왕복 1회 절감.
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const userEmail = session.user.email;

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, center_id")
    .eq("id", userId)
    .single();

  const { data: center } = profile?.center_id
    ? await supabase
        .from("centers")
        .select("name")
        .eq("id", profile.center_id)
        .single()
    : { data: null };

  const needsBootstrap = !profile?.role || !profile?.center_id;
  const initial = (profile?.name ?? userEmail ?? "A").charAt(0).toUpperCase();
  const displayName = profile?.name ?? userEmail ?? "";
  const displayRole =
    profile?.role === "admin"
      ? "관리자"
      : profile?.role === "coach"
        ? "코치"
        : (profile?.role ?? "사용자");
  const centerName = center?.name ?? "플랜비 본점";

  return (
    <div className="admin-shell app">
      <Suspense fallback={null}>
        <GlobalLoading />
      </Suspense>
      <SuppressInvalidTooltip />
      <Sidebar />
      <div className="drawer-backdrop" />

      <main className="main">
        <header className="topbar">
          <div className="topbar-crumb">
            <strong>{centerName}</strong>
            <span className="sep" aria-hidden>/</span>
            <span className="muted">Phase 1 운영 콘솔</span>
          </div>

          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="알림">
              🔔
              <span className="dot" aria-hidden />
            </button>

            <ProfileMenu
              initial={initial}
              name={displayName}
              role={displayRole}
              isAdmin={profile?.role === "admin"}
            />
          </div>
        </header>

        <section className="content">
          {needsBootstrap && (
            <div
              className="panel"
              style={{
                background: "var(--orange-soft)",
                borderColor: "#f0d19a",
                color: "var(--orange)",
                padding: "12px 16px",
              }}
            >
              아직 이 계정에 <b>센터/권한</b>이 지정되지 않았습니다. Supabase SQL
              Editor에서 부트스트랩 SQL을 실행해 센터를 만들고 이 계정을{" "}
              <b>admin</b>으로 승격하세요. (현재 이메일: <b>{userEmail}</b>)
            </div>
          )}
          {children}
        </section>
      </main>
    </div>
  );
}
