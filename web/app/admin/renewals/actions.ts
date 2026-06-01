"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import { checkRenewalGate } from "@/lib/renewal";

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

// notifyRenewal 폐기 (2026-06-01) — 페이지 진입 시 자동 호출되는
// lib/renewal.ts 의 ensureRenewalNotifications 로 단일화. cron 백업 + 신규 학생 자동 보강.
