import "./admin.css";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import Sidebar from "./Sidebar";
import GlobalLoading from "./GlobalLoading";
import SuppressInvalidTooltip from "./SuppressInvalidTooltip";
import ProfileMenu from "./ProfileMenu";
import CenterSwitcher from "./CenterSwitcher";
import { ACTIVE_CENTER_COOKIE } from "@/lib/center";
import PendingApproval from "./PendingApproval";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");
  const userId = session.user.id;
  const userEmail = session.user.email;

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, center_id, applying_center_id")
    .eq("id", userId)
    .single();

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

  // 슈퍼어드민 전환 드롭다운용 — 모든 지점 (RLS 통과)
  const centersForSwitcher = isSuper
    ? ((
        await supabase
          .from("centers")
          .select("id, name")
          .order("name", { ascending: true })
      ).data ?? [])
    : [];

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

  return (
    <div className="admin-shell app">
      <Suspense fallback={null}>
        <GlobalLoading />
      </Suspense>
      <SuppressInvalidTooltip />
      <Sidebar role={role} />
      <div className="drawer-backdrop" />

      <main className="main">
        <header className="topbar">
          <div className="topbar-actions">
            {isSuper && (
              <CenterSwitcher
                centers={centersForSwitcher}
                activeCenterId={activeCenterId}
              />
            )}
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

        <section className="content">
          {isStaff && !activeCenterId && isSuper && (
            <div
              className="panel"
              style={{
                background: "var(--orange-soft)",
                borderColor: "#f0d19a",
                color: "var(--orange)",
                padding: "12px 16px",
              }}
            >
              활성 지점이 설정되지 않았습니다. 우측 상단 <b>지점 선택</b>에서
              지점을 골라 주세요.
            </div>
          )}
          {children}
        </section>
      </main>
    </div>
  );
}
