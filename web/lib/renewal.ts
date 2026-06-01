// 다음 달 수강 확인 게이트 — 매월 N일 기반.
// 미설정 → not-configured (어드민 안내)
// 이달 N일 전 → before (D-day 표시)
// 이달 N일 지남 → after (일괄 처리 가능)

import { requireCenter } from "./center";

export type RenewalGate =
  | { state: "not-configured" }
  | { state: "before"; day: number; daysLeft: number }
  | { state: "after"; day: number };

export function checkRenewalGate(
  day: number | null | undefined,
  now: Date = new Date(),
): RenewalGate {
  if (!day || day < 1 || day > 28) return { state: "not-configured" };
  const today = now.getDate();
  if (today < day) {
    return { state: "before", day, daysLeft: day - today };
  }
  return { state: "after", day };
}

// 페이지 진입 시 자동 호출 — 게이트 통과한 경우 그 달 대기 학생 중
// notified_at IS NULL 인 행만 알림 큐잉 (멱등). 청구·리포트와 같은 ensure 패턴.
// cron (generate_due_renewals) 백업 + 신규 학생 자동 보강.
// 반환: 큐잉된 알림 행 수.
export async function ensureRenewalNotifications(
  targetMonth: string,
): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(targetMonth)) return 0;
  const { supabase, centerId } = await requireCenter();

  // 미발송(notified_at IS NULL) + 대기 상태 만
  const { data: pendingRcs } = await supabase
    .from("renewal_confirmations")
    .select("id, enrollment_id, enrollments(student_id)")
    .eq("center_id", centerId)
    .eq("target_month", targetMonth)
    .eq("status", "대기")
    .is("notified_at", null);
  const rcs = (pendingRcs ?? []) as unknown as {
    id: string;
    enrollment_id: string;
    enrollments: { student_id: string } | null;
  }[];
  if (rcs.length === 0) return 0;

  const studentIds = Array.from(
    new Set(
      rcs.map((r) => r.enrollments?.student_id).filter(Boolean) as string[],
    ),
  );
  if (studentIds.length === 0) return 0;

  const [{ data: parents }, { data: studAccts }] = await Promise.all([
    supabase
      .from("parent_student_links")
      .select("student_id, parent:users(id, phone)")
      .eq("center_id", centerId)
      .eq("status", "linked")
      .in("student_id", studentIds),
    supabase
      .from("student_account_links")
      .select("student_id, account:users(id, phone)")
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

  if (rows.length === 0) return 0;

  const { error: insErr } = await supabase.from("notifications").insert(rows);
  if (insErr) throw new Error("알림 큐잉 실패: " + insErr.message);

  // 같은 month 의 미발송 대기 rc 들에 notified_at 박기 — 다음 진입 시 멱등
  await supabase
    .from("renewal_confirmations")
    .update({
      notified_at: new Date().toISOString(),
      last_notify_count: rows.length,
    })
    .eq("center_id", centerId)
    .eq("target_month", targetMonth)
    .eq("status", "대기")
    .is("notified_at", null);

  return rows.length;
}
