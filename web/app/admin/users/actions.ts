"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function sendResetLink(targetEmail: string) {
  if (!targetEmail) throw new Error("이메일이 비어 있습니다.");

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", user.id)
    .single();

  if (me?.role !== "super_admin" && me?.role !== "admin") {
    throw new Error("권한이 없습니다.");
  }

  // 지점장은 자기 지점 사용자에게만 발송 가능
  if (me.role === "admin") {
    const { data: target } = await supabase
      .from("users")
      .select("center_id")
      .eq("email", targetEmail)
      .maybeSingle();
    if (!target) throw new Error("대상 사용자를 찾을 수 없습니다.");
    if (target.center_id !== me.center_id) {
      throw new Error("다른 지점 사용자의 비밀번호는 초기화할 수 없습니다.");
    }
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://plab01.vercel.app";
  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: `${siteUrl}/reset-password`,
  });
  if (error) throw new Error("재설정 메일 발송 실패: " + error.message);
  revalidatePath("/admin/users");
}
