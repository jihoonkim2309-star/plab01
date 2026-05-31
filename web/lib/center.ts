import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_CENTER_COOKIE = "active_center";

// React cache() 로 같은 request 내 한 번만 실행 (page + action 호출 중복 제거).
// 로그인한 어드민의 작업 대상 center_id 를 확보.
// super_admin: cookie 의 active_center 가 있으면 그것, 없으면 자기 user.center_id (본점).
// admin: 자기 user.center_id.
// 비어 있거나 권한 부족이면 에러.
export const requireCenter = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("center_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") {
    const jar = await cookies();
    const active = jar.get(ACTIVE_CENTER_COOKIE)?.value;
    const centerId = active || profile.center_id;
    if (!centerId) {
      // 활성 지점 미선택 — 에러 대신 대시보드로 이동 (지점 선택 빈상태 화면 표시).
      redirect("/admin?msg=pick-center");
    }
    return { supabase, centerId: centerId as string, userId: user.id };
  }

  if (!profile?.center_id || profile.role !== "admin") {
    // 미승인/권한 부족 — 대시보드로 이동 (PendingApproval 또는 적절한 안내 표시).
    redirect("/admin?msg=no-access");
  }
  return {
    supabase,
    centerId: profile.center_id as string,
    userId: user.id,
  };
});

// 어드민 또는 코치 권한. 측정 입력처럼 코치도 가능한 액션용.
export const requireStaff = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("center_id, role")
    .eq("id", user.id)
    .single();

  if (profile?.role === "super_admin") {
    const jar = await cookies();
    const active = jar.get(ACTIVE_CENTER_COOKIE)?.value;
    const centerId = active || profile.center_id;
    if (!centerId) redirect("/admin?msg=pick-center");
    return {
      supabase,
      centerId: centerId as string,
      role: "admin" as const,
      userId: user.id,
    };
  }

  if (
    !profile?.center_id ||
    (profile.role !== "admin" && profile.role !== "coach")
  ) {
    redirect("/admin?msg=no-access");
  }
  return {
    supabase,
    centerId: profile.center_id as string,
    role: profile.role as "admin" | "coach",
    userId: user.id,
  };
});

// 슈퍼어드민 전용 가드 (지점 관리, 어드민 승인 등)
export const requireSuperAdmin = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "super_admin") {
    redirect("/admin?msg=super-only");
  }
  return { supabase, userId: user.id };
});
