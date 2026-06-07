"use server";

import { revalidatePath } from "next/cache";
import { requireCenter } from "@/lib/center";
import type { SupabaseClient } from "@supabase/supabase-js";

const VALID_STATUSES = ["출석", "지각", "결석", "보강", "기타"] as const;

// 출결 상태 변경 시 학부모/학생 본인 user 에게 notifications 큐잉.
// notify_attendance=true 인 user 만, 본인 메시지가 아닐 때.
async function queueAttendanceNotifications(
  supabase: SupabaseClient,
  args: { centerId: string; classId: string; date: string; studentIds: string[]; status: string },
) {
  const { centerId, classId, date, studentIds, status } = args;
  if (studentIds.length === 0) return;

  const { data: classRow } = await supabase
    .from("classes")
    .select("name")
    .eq("id", classId)
    .maybeSingle();
  const className = (classRow as { name?: string } | null)?.name ?? "수업";

  const [parentRes, studentRes, studentMeta] = await Promise.all([
    supabase
      .from("parent_student_links")
      .select("parent_id, student_id, users!parent_id(id, notify_attendance, notify_push)")
      .in("student_id", studentIds)
      .eq("status", "linked"),
    supabase
      .from("student_account_links")
      .select("user_id, student_id, users(id, notify_attendance, notify_push)")
      .in("student_id", studentIds)
      .eq("status", "linked"),
    supabase.from("students").select("id, name").in("id", studentIds),
  ]);

  type StM = { id: string; name: string };
  const nameMap = new Map(((studentMeta.data ?? []) as StM[]).map((s) => [s.id, s.name]));

  const rows: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  function push(args2: { userId: string; studentId: string; role: "parent" | "student"; settings: { notify_attendance: boolean | null; notify_push: boolean | null } | null }) {
    if (!args2.settings || args2.settings.notify_attendance === false) return;
    const key = `${args2.userId}|${args2.studentId}|${date}|${status}`;
    if (seen.has(key)) return;
    seen.add(key);
    const studentName = nameMap.get(args2.studentId) ?? "";
    const template = args2.role === "parent"
      ? `[출결] ${studentName} 자녀의 ${className} ${status} 처리됨`
      : `[출결] ${className} ${status} 처리됨`;
    rows.push({
      center_id: centerId,
      kind: "push",
      recipient: args2.userId,
      template,
      payload: {
        type: "attendance",
        class_id: classId,
        student_id: args2.studentId,
        status,
        date,
        target_role: args2.role,
        target_user_id: args2.userId,
      },
      status: "대기",
    });
  }

  type PR = { parent_id: string; student_id: string; users: { id: string; notify_attendance: boolean | null; notify_push: boolean | null } | null };
  for (const p of (parentRes.data ?? []) as unknown as PR[]) {
    if (!p.users) continue;
    push({ userId: p.parent_id, studentId: p.student_id, role: "parent", settings: p.users });
  }
  type SR = { user_id: string; student_id: string; users: { id: string; notify_attendance: boolean | null; notify_push: boolean | null } | null };
  for (const s of (studentRes.data ?? []) as unknown as SR[]) {
    if (!s.users) continue;
    push({ userId: s.user_id, studentId: s.student_id, role: "student", settings: s.users });
  }

  if (rows.length > 0) {
    await supabase.from("notifications").insert(rows);
  }
}

// 단일 학생 출결 마킹 (upsert) — class_id + student_id + attendance_date 유니크.
export async function markAttendance(formData: FormData) {
  const { supabase, centerId, userId } = await requireCenter();
  const classId = String(formData.get("class_id") ?? "");
  const studentId = String(formData.get("student_id") ?? "");
  const date = String(formData.get("attendance_date") ?? "");
  const status = String(formData.get("status") ?? "출석");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!classId || !studentId || !date) throw new Error("필수 정보 누락");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new Error("잘못된 상태");
  }

  const { error } = await supabase
    .from("attendance")
    .upsert(
      {
        center_id: centerId,
        class_id: classId,
        student_id: studentId,
        attendance_date: date,
        status,
        note,
        marked_by: userId,
        marked_at: new Date().toISOString(),
      },
      { onConflict: "class_id,student_id,attendance_date" },
    );
  if (error) throw new Error("마킹 실패: " + error.message);

  // 알림 큐잉 (학부모/학생 본인) — 출석/지각/결석 만, 보강/기타는 skip
  if (["출석", "지각", "결석"].includes(status)) {
    await queueAttendanceNotifications(supabase, {
      centerId,
      classId,
      date,
      studentIds: [studentId],
      status,
    });
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/coach/attendance");
}

// 일괄 마킹 — 같은 클래스/날짜 + 학생 list 모두 동일 status 로
export async function bulkMarkAttendance(formData: FormData) {
  const { supabase, centerId, userId } = await requireCenter();
  const classId = String(formData.get("class_id") ?? "");
  const date = String(formData.get("attendance_date") ?? "");
  const status = String(formData.get("status") ?? "출석");
  const studentIds = formData.getAll("student_ids").map(String).filter(Boolean);

  if (!classId || !date || studentIds.length === 0) throw new Error("필수 정보 누락");
  if (!VALID_STATUSES.includes(status as (typeof VALID_STATUSES)[number])) {
    throw new Error("잘못된 상태");
  }

  const nowIso = new Date().toISOString();
  const rows = studentIds.map((sid) => ({
    center_id: centerId,
    class_id: classId,
    student_id: sid,
    attendance_date: date,
    status,
    marked_by: userId,
    marked_at: nowIso,
  }));

  const { error } = await supabase
    .from("attendance")
    .upsert(rows, { onConflict: "class_id,student_id,attendance_date" });
  if (error) throw new Error("일괄 마킹 실패: " + error.message);

  if (["출석", "지각", "결석"].includes(status)) {
    await queueAttendanceNotifications(supabase, {
      centerId,
      classId,
      date,
      studentIds,
      status,
    });
  }

  revalidatePath("/admin/attendance");
  revalidatePath("/coach/attendance");
}
