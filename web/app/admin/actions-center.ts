"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CENTER_COOKIE } from "@/lib/center";

// 슈퍼어드민 전용 — 활성 지점을 cookie 에 저장.
export async function setActiveCenter(formData: FormData) {
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
    throw new Error("슈퍼 어드민만 지점 전환할 수 있습니다.");
  }

  const centerId = String(formData.get("center_id") ?? "");
  if (!centerId) throw new Error("center_id 누락");

  const { data: center } = await supabase
    .from("centers")
    .select("id")
    .eq("id", centerId)
    .single();
  if (!center) throw new Error("존재하지 않는 지점입니다.");

  const jar = await cookies();
  jar.set(ACTIVE_CENTER_COOKIE, centerId, {
    httpOnly: false,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
  revalidatePath("/admin", "layout");
  redirect("/admin");
}

// 슈퍼어드민 — 활성 지점 해제 (대시보드 빈 상태로 돌아감)
export async function unsetActiveCenter() {
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
    throw new Error("슈퍼 어드민만 지점 미선택 모드로 돌아갈 수 있습니다.");
  }
  const jar = await cookies();
  jar.delete(ACTIVE_CENTER_COOKIE);
  revalidatePath("/admin", "layout");
  redirect("/admin");
}
