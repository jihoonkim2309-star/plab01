"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function bulkRenewal(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  // 게이트(renewal_check_day) 제약은 cron 자동 알림에만 적용.
  // 어드민이 수동으로 학부모 의사를 미리 받아 일괄 확정/보류 입력하는 것은 게이트 무관.

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

// notifyRenewal 폐기 (2026-06-01) — 페이지 진입 시 자동 호출되는
// lib/renewal.ts 의 ensureRenewalNotifications 로 단일화. cron 백업 + 신규 학생 자동 보강.
