"use server";

import { revalidatePath } from "next/cache";
import { requireSuperAdmin } from "@/lib/center";

export async function sendResetLink(targetEmail: string) {
  const { supabase } = await requireSuperAdmin();
  if (!targetEmail) throw new Error("이메일이 비어 있습니다.");
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL ?? "https://plab01.vercel.app";
  const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
    redirectTo: `${siteUrl}/reset-password`,
  });
  if (error) throw new Error("재설정 메일 발송 실패: " + error.message);
  revalidatePath("/admin/users");
}
