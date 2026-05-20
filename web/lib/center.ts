import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 로그인한 어드민의 center_id 를 확보. 비어 있으면(부트스트랩 전) 에러.
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

  if (!profile?.center_id || profile.role !== "admin") {
    throw new Error(
      "센터/권한이 설정되지 않았습니다. 부트스트랩 SQL을 먼저 실행하세요.",
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
