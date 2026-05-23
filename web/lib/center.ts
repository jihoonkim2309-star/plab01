import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const ACTIVE_CENTER_COOKIE = "active_center";

// 로그인한 어드민의 작업 대상 center_id 를 확보.
// super_admin: cookie 의 active_center 가 있으면 그것, 없으면 자기 user.center_id (본점).
// admin: 자기 user.center_id.
// 비어 있거나 권한 부족이면 에러.
export async function requireCenter() {
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
      throw new Error(
        "활성 지점이 설정되지 않았습니다. 탑바의 지점 선택에서 지점을 골라 주세요.",
      );
    }
    return { supabase, centerId: centerId as string };
  }

  if (!profile?.center_id || profile.role !== "admin") {
    throw new Error(
      "센터/권한이 설정되지 않았습니다. 슈퍼 어드민의 승인을 기다려 주세요.",
    );
  }
  return { supabase, centerId: profile.center_id as string };
}

// 어드민 또는 코치 권한. 측정 입력처럼 코치도 가능한 액션용.
export async function requireStaff() {
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
    if (!centerId) throw new Error("활성 지점이 설정되지 않았습니다.");
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
    throw new Error("어드민 또는 코치 권한이 필요합니다.");
  }
  return {
    supabase,
    centerId: profile.center_id as string,
    role: profile.role as "admin" | "coach",
    userId: user.id,
  };
}

// 슈퍼어드민 전용 가드 (지점 관리, 어드민 승인 등)
export async function requireSuperAdmin() {
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
    throw new Error("슈퍼 어드민 권한이 필요합니다.");
  }
  return { supabase, userId: user.id };
}
