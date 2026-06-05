"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 자녀 연결 신청 — pending 상태로 row 생성. admin 이 승인하면 linked.
// center_id 는 로그인 학부모의 users.center_id 를 자동 사용.
// embed=1 (preview iframe) 이거나 미인증이면 mock 처리.
export async function submitParentLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect("/parent/child?msg=submitted");
  }

  const { data: profile } = await supabase
    .from("users")
    .select("center_id")
    .eq("id", session.user.id)
    .single();
  const centerId = (profile as { center_id?: string } | null)?.center_id;
  if (!centerId) {
    redirect("/parent/child/new?error=no-center");
  }

  const studentName = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const birth = String(formData.get("birth") ?? "").trim() || null;
  const relation = String(formData.get("relation") ?? "").trim() || null;

  if (!studentName || !school || !grade) {
    redirect("/parent/child/new?error=missing");
  }

  const { error } = await supabase.from("parent_student_links").insert({
    parent_id: session.user.id,
    center_id: centerId,
    requested_name: studentName,
    requested_school: school,
    requested_grade: grade,
    requested_birth: birth,
    relation,
    status: "pending",
  });

  if (error) {
    redirect("/parent/child/new?error=" + encodeURIComponent(error.message));
  }
  redirect("/parent/child?msg=submitted");
}
