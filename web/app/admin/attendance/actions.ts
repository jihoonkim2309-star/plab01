"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/center";

const VALID_STATUSES = ["출석", "지각", "결석", "보강", "기타"] as const;

// 출결 → 학부모/학생 알림 큐잉. 코치는 링크 테이블 read 권한이 없어
// 클라이언트에서 수신자 조회가 막히므로 definer RPC 로 처리 (어드민·코치 공용).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function queueAttendanceNotifications(
  supabase: any,
  args: { centerId: string; classId: string; date: string; studentIds: string[]; status: string },
) {
  if (args.studentIds.length === 0) return;
  await supabase.rpc("queue_attendance_notification", {
    p_class_id: args.classId,
    p_date: args.date,
    p_status: args.status,
    p_student_ids: args.studentIds,
    p_center_id: args.centerId,
  });
}

// 단일 학생 출결 마킹 (upsert) — class_id + student_id + attendance_date 유니크.
export async function markAttendance(formData: FormData) {
  const { supabase, centerId, userId } = await requireStaff();
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
  const { supabase, centerId, userId } = await requireStaff();
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
