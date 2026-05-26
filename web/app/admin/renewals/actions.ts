"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { checkRenewalGate } from "@/lib/renewal";

// 상품이 지정된 학생 중 활성 수강등록(enrollment)이 없는 경우 자동 생성.
export async function syncEnrollments() {
  const { supabase, centerId } = await requireCenter();

  const { data: studs } = await supabase
    .from("students")
    .select("id, class_id, product_id, attendance_days")
    .eq("center_id", centerId)
    .not("product_id", "is", null);

  const { data: existing } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("center_id", centerId)
    .eq("status", "수강중");
  const have = new Set((existing ?? []).map((e) => e.student_id));

  const rows = (studs ?? [])
    .filter((s) => !have.has(s.id))
    .map((s) => ({
      center_id: centerId,
      student_id: s.id,
      class_id: s.class_id,
      product_id: s.product_id,
      attendance_days: s.attendance_days,
      status: "수강중",
    }));

  if (rows.length) {
    const { error } = await supabase.from("enrollments").insert(rows);
    if (error) throw new Error("동기화 실패: " + error.message);
  }
  revalidatePath("/admin/renewals");
  redirect("/admin/renewals");
}

export async function bulkRenewal(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  // 서버 측 게이트 (UI 우회 차단)
  const { data: center } = await supabase
    .from("centers")
    .select("renewal_check_day")
    .eq("id", centerId)
    .maybeSingle();
  const gate = checkRenewalGate(
    (center as { renewal_check_day: number | null } | null)?.renewal_check_day,
  );
  if (gate.state !== "after") {
    throw new Error(
      gate.state === "not-configured"
        ? "다음 달 수강 확인일이 설정되지 않았습니다. 설정에서 먼저 지정하세요."
        : `매월 ${gate.day}일 수강 확인일이 지나야 일괄 처리가 가능합니다 (D-${gate.daysLeft}).`,
    );
  }

  const ids = formData.getAll("ids").map(String).filter(Boolean);
  const targetMonth = String(formData.get("target_month") ?? "");
  const status = String(formData.get("status") ?? "");
  if (!targetMonth) throw new Error("대상 월이 없습니다.");
  if (ids.length === 0) throw new Error("선택된 항목이 없습니다.");
  if (!["대기", "확정", "보류"].includes(status))
    throw new Error("잘못된 상태입니다.");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const rows = ids.map((enrollment_id) => ({
    center_id: centerId,
    enrollment_id,
    target_month: targetMonth,
    status,
    decided_at: new Date().toISOString(),
    decided_by: user?.id ?? null,
    decided_by_role: "admin" as const,
  }));

  const { error } = await supabase
    .from("renewal_confirmations")
    .upsert(rows, { onConflict: "enrollment_id,target_month" });
  if (error) throw new Error("처리 실패: " + error.message);

  // 학생 마스터 status 동기화 — 확정→활성, 보류→휴원
  if (status === "확정" || status === "보류") {
    const newStudentStatus = status === "확정" ? "정상" : "휴원";
    const { data: enrolls } = await supabase
      .from("enrollments")
      .select("student_id")
      .eq("center_id", centerId)
      .in("id", ids);
    const studentIds = Array.from(
      new Set(
        ((enrolls ?? []) as { student_id: string | null }[])
          .map((e) => e.student_id)
          .filter((x): x is string => !!x),
      ),
    );
    if (studentIds.length > 0) {
      await supabase
        .from("students")
        .update({ status: newStudentStatus })
        .eq("center_id", centerId)
        .in("id", studentIds);
    }
  }

  revalidatePath("/admin/renewals");
  revalidatePath("/admin/students");
  redirect(`/admin/renewals?ym=${targetMonth}`);
}

// 수동 알림 재발송 — 대기 상태인 enrollment 의 학부모/학생에게 한 번 더 푸시 큐잉.
export async function notifyRenewal(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const targetMonth = String(formData.get("target_month") ?? "");
  if (!targetMonth) throw new Error("대상 월이 없습니다.");

  // 대기 상태 enrollment 만
  const { data: pendingRcs } = await supabase
    .from("renewal_confirmations")
    .select("id, enrollment_id, enrollments(student_id)")
    .eq("center_id", centerId)
    .eq("target_month", targetMonth)
    .eq("status", "대기");
  const rcs = (pendingRcs ?? []) as unknown as {
    id: string;
    enrollment_id: string;
    enrollments: { student_id: string } | null;
  }[];
  if (rcs.length === 0) {
    redirect(`/admin/renewals?ym=${targetMonth}&notified=0`);
  }

  const studentIds = Array.from(
    new Set(rcs.map((r) => r.enrollments?.student_id).filter(Boolean) as string[]),
  );
  if (studentIds.length === 0) {
    redirect(`/admin/renewals?ym=${targetMonth}&notified=0`);
  }

  const [{ data: parents }, { data: studAccts }] = await Promise.all([
    supabase
      .from("parent_student_links")
      .select("student_id, parent:users(id, name, phone)")
      .eq("center_id", centerId)
      .eq("status", "linked")
      .in("student_id", studentIds),
    supabase
      .from("student_account_links")
      .select("student_id, account:users(id, name, phone)")
      .eq("center_id", centerId)
      .eq("status", "linked")
      .in("student_id", studentIds),
  ]);

  const template = `[수강 확인] 다음 달 ${targetMonth} 등록 의사를 확인해 주세요`;
  const rows: Array<Record<string, unknown>> = [];
  const studentToEnrollment = new Map(
    rcs.map((r) => [r.enrollments?.student_id ?? "", r.enrollment_id]),
  );
  const seen = new Set<string>();
  function pushFor(
    studentId: string,
    u: { id: string; phone: string | null } | null,
    role: "parent" | "student",
  ) {
    if (!u) return;
    const key = `${u.id}|${studentId}`;
    if (seen.has(key)) return;
    seen.add(key);
    rows.push({
      center_id: centerId,
      kind: "push",
      recipient: u.phone ?? u.id,
      template,
      payload: {
        type: "renewal_check",
        enrollment_id: studentToEnrollment.get(studentId) ?? null,
        student_id: studentId,
        target_month: targetMonth,
        target_role: role,
        target_user_id: u.id,
      },
      status: "대기",
    });
  }
  for (const p of (parents ?? []) as unknown as {
    student_id: string;
    parent: { id: string; phone: string | null } | null;
  }[]) {
    pushFor(p.student_id, p.parent, "parent");
  }
  for (const s of (studAccts ?? []) as unknown as {
    student_id: string;
    account: { id: string; phone: string | null } | null;
  }[]) {
    pushFor(s.student_id, s.account, "student");
  }

  if (rows.length === 0) {
    redirect(`/admin/renewals?ym=${targetMonth}&notified=0`);
  }

  const { error: insErr } = await supabase.from("notifications").insert(rows);
  if (insErr) throw new Error("알림 큐잉 실패: " + insErr.message);

  // 각 대기 rc 의 notified_at + last_notify_count 갱신
  await supabase
    .from("renewal_confirmations")
    .update({
      notified_at: new Date().toISOString(),
      last_notify_count: rows.length,
    })
    .eq("center_id", centerId)
    .eq("target_month", targetMonth)
    .eq("status", "대기");

  revalidatePath("/admin/renewals");
  revalidatePath("/admin/notifications");
  redirect(`/admin/renewals?ym=${targetMonth}&notified=${rows.length}`);
}
