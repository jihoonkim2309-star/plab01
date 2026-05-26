"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

export async function createMakeup(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const class_id = String(formData.get("class_id") ?? "");
  if (!class_id) throw new Error("클래스를 선택하세요.");

  const { error } = await supabase.from("makeups").insert({
    center_id: centerId,
    class_id,
    original_date: String(formData.get("original_date") ?? "") || null,
    makeup_date: String(formData.get("makeup_date") ?? "") || null,
    reason: String(formData.get("reason") ?? "") || null,
  });
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/makeups");
  redirect("/admin/makeups");
}

export async function setMakeupStatus(id: string, status: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("makeups")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error("처리 실패: " + error.message);
  revalidatePath("/admin/makeups");
  redirect("/admin/makeups");
}

export async function deleteMakeup(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("makeups").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/makeups");
  redirect("/admin/makeups");
}

// 보강 알림 큐잉 — 학생/학부모 포털용 notifications 행 다수 insert.
// FCM/Solapi 실 전송은 큐 워커가 처리 (Phase 2). 지금은 '대기' 상태로 쌓아두기만.
export async function notifyMakeup(id: string) {
  const { supabase, centerId } = await requireCenter();

  // 1) 보강 정보 + 클래스 이름
  const { data: mk } = await supabase
    .from("makeups")
    .select("id, class_id, makeup_date, reason, status, classes(name)")
    .eq("center_id", centerId)
    .eq("id", id)
    .maybeSingle();
  if (!mk) throw new Error("보강을 찾을 수 없습니다.");
  const makeup = mk as unknown as {
    id: string;
    class_id: string;
    makeup_date: string | null;
    reason: string | null;
    status: string;
    classes: { name: string } | null;
  };
  if (makeup.status === "취소") throw new Error("취소된 보강에는 알림을 보낼 수 없습니다.");

  // 2) 그 클래스에 등록된 활성 학생들
  const { data: studs } = await supabase
    .from("students")
    .select("id, name, phone")
    .eq("center_id", centerId)
    .eq("class_id", makeup.class_id)
    .eq("status", "활성");
  const students = (studs ?? []) as {
    id: string;
    name: string;
    phone: string | null;
  }[];
  if (students.length === 0) {
    throw new Error("이 클래스에 활성 상태 학생이 없습니다.");
  }
  const studentIds = students.map((s) => s.id);

  // 3) 학부모·학생 본인 user 매칭 (연결됨 상태만)
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

  // 4) 알림 행 빌드
  const className = makeup.classes?.name ?? "수업";
  const date = makeup.makeup_date ?? "";
  const reason = makeup.reason ? ` (사유: ${makeup.reason})` : "";
  const template = `[보강 안내] ${className} 의 보강이 ${date} 에 진행됩니다.${reason}`;

  const rows: Array<Record<string, unknown>> = [];
  const seenRecipient = new Set<string>();

  function pushFor(
    studentId: string,
    user: { id: string; name: string | null; phone: string | null } | null,
    role: "parent" | "student",
  ) {
    if (!user) return;
    const key = `${user.id}|${studentId}`;
    if (seenRecipient.has(key)) return;
    seenRecipient.add(key);
    rows.push({
      center_id: centerId,
      kind: "push",
      recipient: user.phone ?? user.id,
      template,
      payload: {
        type: "makeup",
        makeup_id: makeup.id,
        class_id: makeup.class_id,
        class_name: className,
        makeup_date: date,
        reason: makeup.reason,
        target_role: role,
        target_user_id: user.id,
        target_student_id: studentId,
      },
      status: "대기",
    });
  }

  for (const p of (parents ?? []) as unknown as {
    student_id: string;
    parent: { id: string; name: string | null; phone: string | null } | null;
  }[]) {
    pushFor(p.student_id, p.parent, "parent");
  }
  for (const s of (studAccts ?? []) as unknown as {
    student_id: string;
    account: { id: string; name: string | null; phone: string | null } | null;
  }[]) {
    pushFor(s.student_id, s.account, "student");
  }

  if (rows.length === 0) {
    throw new Error(
      "발송 대상이 없습니다 — 학부모/학생이 아직 포털에 연결되지 않았어요.",
    );
  }

  const { error: insErr } = await supabase.from("notifications").insert(rows);
  if (insErr) throw new Error("알림 큐잉 실패: " + insErr.message);

  await supabase
    .from("makeups")
    .update({
      notified_at: new Date().toISOString(),
      last_notify_count: rows.length,
    })
    .eq("center_id", centerId)
    .eq("id", id);

  revalidatePath("/admin/makeups");
  revalidatePath("/admin/notifications");
  redirect(`/admin/makeups?makeup=${id}&notified=${rows.length}`);
}
