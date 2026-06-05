"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// 자녀 연결 신청.
// mode='picker'  → 학부모가 마스킹된 학생 select 에서 직접 지정 (student_id 보냄, requested_* 도 학교/학년만)
// mode='manual'  → 직접 입력 (student_id 없음, requested_* 모두 채움)
// status='pending' 으로 동일. 어드민이 단순 [승인] 으로 linked. picker 면 매칭 모달 안 필요.
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

  const mode = String(formData.get("mode") ?? "picker");
  const relation = String(formData.get("relation") ?? "").trim() || null;

  if (mode === "picker") {
    const studentId = String(formData.get("student_id") ?? "").trim();
    const school = String(formData.get("school") ?? "").trim();
    const grade = String(formData.get("grade") ?? "").trim();
    if (!studentId) redirect("/parent/child/new?error=no-student");

    // 중복 신청 방지 (같은 학부모 + 학생)
    const { data: existing } = await supabase
      .from("parent_student_links")
      .select("id, status")
      .eq("parent_id", session.user.id)
      .eq("student_id", studentId)
      .maybeSingle();
    if (existing) {
      redirect("/parent/child?msg=already-applied");
    }

    const { error } = await supabase.from("parent_student_links").insert({
      parent_id: session.user.id,
      center_id: centerId,
      student_id: studentId,
      requested_school: school || null,
      requested_grade: grade || null,
      relation,
      status: "pending",
    });

    if (error) {
      redirect("/parent/child/new?error=" + encodeURIComponent(error.message));
    }
    redirect("/parent/child?msg=submitted");
  }

  // manual 모드
  const studentName = String(formData.get("name") ?? "").trim();
  const school = String(formData.get("school") ?? "").trim();
  const grade = String(formData.get("grade") ?? "").trim();
  const birth = String(formData.get("birth") ?? "").trim() || null;

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
