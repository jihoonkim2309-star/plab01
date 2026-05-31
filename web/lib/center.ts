import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_CENTER_COOKIE = "active_center";

// middleware 에서 set 한 header (x-user-id / x-user-role / x-center-id) 우선 사용.
// supabase round trip 없음. fallback 으로 직접 auth 호출.
export const requireCenter = cache(async () => {
  const supabase = await createClient();
  const h = await headers();
  const headerUserId = h.get("x-user-id");
  const headerRole = h.get("x-user-role");
  const headerCenter = h.get("x-center-id");

  if (headerUserId && headerRole) {
    if (headerRole === "super_admin") {
      if (!headerCenter) redirect("/admin?msg=pick-center");
      return { supabase, centerId: headerCenter, userId: headerUserId };
    }
    if (headerRole === "admin" && headerCenter) {
      return { supabase, centerId: headerCenter, userId: headerUserId };
    }
    redirect("/admin?msg=no-access");
  }

  // fallback — middleware 누락 등 예외
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
    return { supabase, centerId: centerId as string, userId: user.id };
  }
  if (!profile?.center_id || profile.role !== "admin") {
    redirect("/admin?msg=no-access");
  }
  return {
    supabase,
    centerId: profile.center_id as string,
    userId: user.id,
  };
});

// 어드민 또는 코치 권한.
export const requireStaff = cache(async () => {
  const supabase = await createClient();
  const h = await headers();
  const headerUserId = h.get("x-user-id");
  const headerRole = h.get("x-user-role");
  const headerCenter = h.get("x-center-id");

  if (headerUserId && headerRole) {
    if (headerRole === "super_admin") {
      if (!headerCenter) redirect("/admin?msg=pick-center");
      return {
        supabase,
        centerId: headerCenter,
        role: "admin" as const,
        userId: headerUserId,
      };
    }
    if (
      (headerRole === "admin" || headerRole === "coach") &&
      headerCenter
    ) {
      return {
        supabase,
        centerId: headerCenter,
        role: headerRole as "admin" | "coach",
        userId: headerUserId,
      };
    }
    redirect("/admin?msg=no-access");
  }

  // fallback
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
