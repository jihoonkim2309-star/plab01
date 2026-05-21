import "./admin.css";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";
import GlobalLoading from "./GlobalLoading";
import SuppressInvalidTooltip from "./SuppressInvalidTooltip";
import { signOut } from "./actions";

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

  const needsBootstrap = !profile?.role || !profile?.center_id;
  const initial = (profile?.name ?? userEmail ?? "A").charAt(0).toUpperCase();

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
          <div className="topbar-search">
            <span className="icon" aria-hidden>🔍</span>
            <input
              type="search"
              placeholder="학생·학부모·청구번호 검색"
              aria-label="검색"
            />
            <span className="kbd" aria-hidden>Ctrl K</span>
          </div>

          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="알림">
              🔔
              <span className="dot" aria-hidden />
            </button>

            <div className="profile">
              <div className="avatar" aria-hidden>{initial}</div>
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span className="name">{profile?.name ?? userEmail}</span>
                <span className="name-sub">{profile?.role ?? "관리자"}</span>
              </div>
              <form action={signOut}>
                <button className="btn outline sm" type="submit" style={{ marginLeft: 8 }}>
                  로그아웃
                </button>
              </form>
            </div>
          </div>
        </header>

        <div className="workspace-strip">
          <div className="crumb">
            <strong>플랜비 본점</strong>
            <span>/</span>
            <span>Phase 1 운영 콘솔</span>
          </div>
          <div className="system-state">
            <span className="badge green">DB 정상</span>
            <span className="badge brand">Slice 1 가동</span>
          </div>
        </div>

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
