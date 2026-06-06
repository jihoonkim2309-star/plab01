"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 학생 본인 → 학생 레코드 연결 신청. picker 만 (student_id 직접).
// student_account_links 의 student_id 가 NOT NULL 이라 manual 입력 미지원.
export async function submitStudentLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/user/login");

  const { data: profile } = await supabase
    .from("users")
    .select("center_id")
    .eq("id", session.user.id)
    .single();
  const centerId = (profile as { center_id?: string } | null)?.center_id;
  if (!centerId) redirect("/student/connect/new?error=no-center");

  const studentId = String(formData.get("student_id") ?? "").trim();
  if (!studentId) redirect("/student/connect/new?error=no-student");

  // 중복 신청 가드 (같은 학생-같은 user)
  const { data: existing } = await supabase
    .from("student_account_links")
    .select("id")
    .eq("user_id", session.user.id)
    .eq("student_id", studentId)
    .maybeSingle();
  if (existing) redirect("/student/connect?msg=already-applied");

  const { error } = await supabase.from("student_account_links").insert({
    center_id: centerId,
    user_id: session.user.id,
    student_id: studentId,
    status: "pending",
  });

  if (error) redirect("/student/connect/new?error=" + encodeURIComponent(error.message));
  redirect("/student/connect?msg=submitted");
}
