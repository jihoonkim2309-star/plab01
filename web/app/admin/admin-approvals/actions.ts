"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function authorize() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { data: me } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", user.id)
    .single();
  if (me?.role !== "super_admin" && me?.role !== "admin") {
    throw new Error("승인 권한이 없습니다.");
  }
  return { supabase, me };
}

export async function approveAdmin(formData: FormData) {
  const { supabase, me } = await authorize();
  const targetId = String(formData.get("user_id") ?? "");
  const centerId = String(formData.get("center_id") ?? "");
  const role = String(formData.get("role") ?? "admin");
  if (!targetId || !centerId) throw new Error("필수 값 누락");
  if (!["admin", "coach", "driver"].includes(role)) {
    throw new Error("허용되지 않은 역할");
  }

  // 슈퍼어드민 은 지점장(admin) 승인만 수행. 코치/기사는 지점장이 처리.
  if (me.role === "super_admin" && role !== "admin") {
    throw new Error("코치·기사 승인은 해당 지점의 지점장이 처리해야 합니다.");
  }

  // 일반 admin 은 자기 센터만 승인 가능 (admin/coach/driver 모두).
  if (me.role === "admin" && centerId !== me.center_id) {
    throw new Error("자기 지점의 신청만 승인할 수 있습니다.");
  }

  const { error } = await supabase
    .from("users")
    .update({
      role,
      center_id: centerId,
      applying_center_id: null,
      applying_role: null,
    })
    .eq("id", targetId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/admin-approvals");
}

export async function rejectAdmin(formData: FormData) {
  const { supabase, me } = await authorize();
  const targetId = String(formData.get("user_id") ?? "");
  if (!targetId) throw new Error("필수 값 누락");

  // 일반 admin 은 자기 센터에 신청한 사용자만 거절 가능.
  if (me.role === "admin") {
    const { data: target } = await supabase
      .from("users")
      .select("applying_center_id")
      .eq("id", targetId)
      .single();
    if (target?.applying_center_id !== me.center_id) {
      throw new Error("자기 지점의 신청만 거절할 수 있습니다.");
    }
  }

  const { error } = await supabase
    .from("users")
    .update({ applying_center_id: null, applying_role: null })
    .eq("id", targetId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/admin-approvals");
}
