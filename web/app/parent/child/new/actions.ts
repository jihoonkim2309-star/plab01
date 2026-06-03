"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 자녀 연결 신청 — pending 상태로 row 생성. admin 이 승인하면 linked.
// embed=1 (preview iframe) 이거나 미인증이면 mock 처리.
export async function submitParentLink(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    // 미인증 (preview/embed 등) — mock 성공
    redirect("/parent/child?msg=submitted");
  }

  const centerId = String(formData.get("center_id") ?? "");
  const studentName = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const birth = String(formData.get("birth") ?? "").trim() || null;
  const relation = String(formData.get("relation") ?? "").trim() || null;

  if (!centerId || !studentName || !school || !grade) {
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
