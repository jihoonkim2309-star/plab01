"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function updateMyProfile(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();

  if (!name) {
    redirect("/admin/me?error=" + encodeURIComponent("이름은 필수입니다."));
  }

  const { error } = await supabase
    .from("users")
    .update({ name, phone: phone || null })
    .eq("id", user.id);

  if (error) {
    redirect("/admin/me?error=" + encodeURIComponent(error.message));
  }
  redirect("/admin/me?saved=1");
}

export async function changeMyPassword(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const next = String(formData.get("new_password") ?? "");
  const confirm = String(formData.get("confirm_password") ?? "");

  if (next.length < 6) {
    redirect(
      "/admin/me?perror=" +
        encodeURIComponent("비밀번호는 6자 이상이어야 합니다."),
    );
  }
  if (next !== confirm) {
    redirect(
      "/admin/me?perror=" +
        encodeURIComponent("새 비밀번호 확인이 일치하지 않습니다."),
    );
  }

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) {
    redirect("/admin/me?perror=" + encodeURIComponent(error.message));
  }
  redirect("/admin/me?psaved=1");
}
