import "./admin.css";
import { Suspense } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";
import GlobalLoading from "./GlobalLoading";
import SuppressInvalidTooltip from "./SuppressInvalidTooltip";
import SuppressAutofill from "./SuppressAutofill";
import ProfileMenu from "./ProfileMenu";
import SidebarWorkspace from "./SidebarWorkspace";
import DrawerToggle from "./DrawerToggle";
import { AdminTabsProvider, AdminTabBar, AdminTabContent } from "./AdminTabs";
import FrameDetector from "./FrameDetector";
import { labelForPath } from "./labelFor";
import { ACTIVE_CENTER_COOKIE } from "@/lib/center";
import { SESSION_COOKIE, isActiveSession } from "@/lib/session";
import PendingApproval from "./PendingApproval";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const h = await headers();
  const pathname = h.get("x-pathname") ?? "/admin";
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const userEmail = session.user.email;

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, center_id, applying_center_id, current_session_id, last_seen_at")
    .eq("id", userId)
    .single();

  // 단일 세션 가드
  const jarPre = await cookies();
  const cookieSid = jarPre.get(SESSION_COOKIE)?.value ?? null;

  // legacy 호환: session 정책 배포 전 로그인한 사용자는 session_id 가 null.
  // cookie 가 있으면 그 값으로, 없으면 새 UUID 발급해서 DB 와 cookie 동기화 (현 진입을 active 로 등록).
  if (!profile?.current_session_id) {
    const newSid = cookieSid ?? crypto.randomUUID();
    await supabase
      .from("users")
      .update({ current_session_id: newSid, last_seen_at: new Date().toISOString() })
      .eq("id", userId);
    if (!cookieSid) {
      jarPre.set(SESSION_COOKIE, newSid, {
        path: "/",
        sameSite: "lax",
        maxAge: 4 * 60 * 60,
      });
    }
  } else {
    // cookie ≠ DB → 다른 곳 takeover 발생. 강제 로그아웃.
    if (cookieSid !== profile.current_session_id) {
      await supabase.auth.signOut();
      redirect("/login?msg=ousted");
    }
    // inactivity 만료 (4h+ 미갱신)
    if (profile.last_seen_at && !isActiveSession(profile.last_seen_at)) {
      await supabase
        .from("users")
        .update({ current_session_id: null })
        .eq("id", userId);
      await supabase.auth.signOut();
      redirect("/login?msg=inactive");
    }
    // 활동 갱신
    await supabase
      .from("users")
      .update({ last_seen_at: new Date().toISOString() })
      .eq("id", userId);
  }

  const role = profile?.role ?? null;
  const isSuper = role === "super_admin";
  const isAdmin = role === "admin";
  const isStaff = isSuper || isAdmin || role === "coach";

  // 가입 후 승인 대기: role 이 null 인 일반 가입자.
  if (!role) {
    const { data: applyingCenter } = profile?.applying_center_id
      ? await supabase
          .from("centers")
          .select("name")
          .eq("id", profile.applying_center_id)
          .single()
      : { data: null };

    return (
      <PendingApproval
        name={profile?.name ?? userEmail ?? ""}
        email={userEmail ?? ""}
        applyingCenterName={applyingCenter?.name ?? null}
      />
    );
  }

  // 활성 지점 (super_admin 만 의미. 일반 admin/coach 는 본인 center_id).
  const jar = await cookies();
  const activeCenterId =
    (isSuper ? jar.get(ACTIVE_CENTER_COOKIE)?.value : profile?.center_id) ??
    profile?.center_id ??
    null;

  // 사이드바 워크스페이스 셀렉터 + 활성 지점명
  const [activeCenterRes, allCentersRes] = await Promise.all([
    activeCenterId
      ? supabase.from("centers").select("name").eq("id", activeCenterId).single()
      : Promise.resolve({ data: null }),
    isSuper
      ? supabase.from("centers").select("id, name").order("name", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);
  const activeCenterName =
    (activeCenterRes.data as { name: string } | null)?.name ?? "프랜차이즈 관리";
  const centersForSwitcher =
    (allCentersRes.data as { id: string; name: string }[] | null) ?? [];


  const initial = (profile?.name ?? userEmail ?? "A").charAt(0).toUpperCase();
  const displayName = profile?.name ?? userEmail ?? "";
  const displayRole =
    role === "super_admin"
      ? "슈퍼 어드민"
      : role === "admin"
        ? "관리자"
        : role === "coach"
          ? "코치"
          : (role ?? "사용자");

  const initialLabel = labelForPath(pathname);

  return (
    <AdminTabsProvider initialLabel={initialLabel}>
    <div className="admin-shell app">
      <Suspense fallback={null}>
        <GlobalLoading />
      </Suspense>
      <Suspense fallback={null}>
        <FrameDetector />
      </Suspense>
      <SuppressInvalidTooltip />
      <SuppressAutofill />
      <Sidebar role={role} hasActiveCenter={!!activeCenterId} />
      <div className="drawer-backdrop" />

      <main className="main">
        <header className="topbar">
          <DrawerToggle />
          <SidebarWorkspace
            isSuper={isSuper}
            centers={centersForSwitcher}
            activeCenterId={activeCenterId}
            activeCenterName={activeCenterName}
          />

          <div className="topbar-actions">
            <button type="button" className="icon-button" aria-label="알림">
              🔔
              <span className="dot" aria-hidden />
            </button>

            <ProfileMenu
              initial={initial}
              name={displayName}
              role={displayRole}
              isAdmin={isAdmin || isSuper}
            />
          </div>
        </header>

        <AdminTabBar />

        <section className="content">
          {(() => {
            // super_admin 활성 지점 미선택 ('프랜차이즈 관리' 모드) 시 통과할 경로:
            //  - /admin (메인 대시보드 — SelectCenterDashboard)
            //  - 프랜차이즈 관리 메뉴: centers / admin-approvals / hq-invoices / hq-notices / hq-inquiries / hq-chat
            //  - 글로벌 시스템: users / me
            // 그 외 지점 컨텍스트 페이지는 차단 (requireCenter redirect 무한루프 회피)
            const SUPER_OK_PREFIXES = [
              "/admin/centers",
              "/admin/admin-approvals",
              "/admin/hq-invoices",
              "/admin/hq-notices",
              "/admin/hq-inquiries",
              "/admin/hq-chat",
              "/admin/users",
              "/admin/me",
            ];
            const isSuperOkPath =
              pathname === "/admin" ||
              SUPER_OK_PREFIXES.some(
                (p) => pathname === p || pathname.startsWith(p + "/"),
              );
            const isBlocked =
              isStaff && !activeCenterId && isSuper && !isSuperOkPath;
            if (!isBlocked) return <AdminTabContent>{children}</AdminTabContent>;
            return (
              <div
                className="panel"
                style={{
                  background: "var(--orange-soft)",
                  borderColor: "#f0d19a",
                  color: "var(--orange)",
                  padding: "12px 16px",
                }}
              >
                이 메뉴는 지점 컨텍스트에서만 접근 가능합니다. 상단 좌측
                워크스페이스 셀렉터에서 지점을 골라 주세요.
              </div>
            );
          })()}
        </section>
      </main>
    </div>
    </AdminTabsProvider>
  );
}
