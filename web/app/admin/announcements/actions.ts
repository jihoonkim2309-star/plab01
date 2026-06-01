"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

type Scope = "all" | "class" | "students";
type Audience = "parent_only" | "student_only" | "parent_student";

function parseScope(s: string): Scope {
  return s === "class" || s === "students" ? s : "all";
}
function parseAudience(s: string): Audience {
  return s === "parent_only" || s === "student_only" ? s : "parent_student";
}

// 공지 생성 (draft)
export async function createAnnouncement(formData: FormData) {
  const { supabase, centerId, userId } = await requireCenter();
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const scope = parseScope(String(formData.get("scope") ?? "all"));
  const audience = parseAudience(String(formData.get("audience") ?? "parent_student"));
  const targetClassIds = formData.getAll("target_class_ids").map(String).filter(Boolean);
  const targetStudentIds = formData.getAll("target_student_ids").map(String).filter(Boolean);
  if (!title) throw new Error("제목을 입력해 주세요.");
  if (!body) throw new Error("본문을 입력해 주세요.");
  if (scope === "class" && targetClassIds.length === 0)
    throw new Error("대상 클래스를 1개 이상 선택해 주세요.");
  if (scope === "students" && targetStudentIds.length === 0)
    throw new Error("대상 학생을 1명 이상 선택해 주세요.");

  const { data, error } = await supabase
    .from("announcements")
    .insert({
      center_id: centerId,
      title,
      body,
      scope,
      audience,
      target_class_ids: scope === "class" ? targetClassIds : null,
      target_student_ids: scope === "students" ? targetStudentIds : null,
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw new Error("공지 생성 실패: " + error.message);

  revalidatePath("/admin/announcements");
  redirect(`/admin/announcements?id=${(data as { id: string }).id}`);
}

// 공지 수정 (draft 만)
export async function updateAnnouncement(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 가 비어 있습니다.");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const scope = parseScope(String(formData.get("scope") ?? "all"));
  const audience = parseAudience(String(formData.get("audience") ?? "parent_student"));
  const targetClassIds = formData.getAll("target_class_ids").map(String).filter(Boolean);
  const targetStudentIds = formData.getAll("target_student_ids").map(String).filter(Boolean);
  if (!title || !body) throw new Error("제목·본문은 필수입니다.");

  // 발행된 공지는 수정 차단
  const { data: cur } = await supabase
    .from("announcements")
    .select("published_at")
    .eq("id", id)
    .eq("center_id", centerId)
    .single();
  if ((cur as { published_at: string | null } | null)?.published_at)
    throw new Error("이미 발행된 공지는 수정할 수 없습니다.");

  const { error } = await supabase
    .from("announcements")
    .update({
      title,
      body,
      scope,
      audience,
      target_class_ids: scope === "class" ? targetClassIds : null,
      target_student_ids: scope === "students" ? targetStudentIds : null,
    })
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("공지 수정 실패: " + error.message);

  revalidatePath("/admin/announcements");
  redirect(`/admin/announcements?id=${id}`);
}

// 공지 발행 — 대상 학생 추출 + 학부모/학생 user 매칭 + notifications 큐 N행 insert
export async function publishAnnouncement(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 가 비어 있습니다.");

  const { data: ann, error: getErr } = await supabase
    .from("announcements")
    .select("id, title, body, scope, audience, target_class_ids, target_student_ids, published_at")
    .eq("id", id)
    .eq("center_id", centerId)
    .single();
  if (getErr || !ann) throw new Error("공지를 찾을 수 없습니다.");
  const a = ann as {
    id: string;
    title: string;
    body: string;
    scope: Scope;
    audience: Audience;
    target_class_ids: string[] | null;
    target_student_ids: string[] | null;
    published_at: string | null;
  };
  if (a.published_at) throw new Error("이미 발행된 공지입니다.");

  // 1. 대상 학생 ID 추출
  let studentIds: string[] = [];
  if (a.scope === "all") {
    const { data: ss } = await supabase
      .from("students")
      .select("id")
      .eq("center_id", centerId)
      .in("status", ["정상", "상담중"]);
    studentIds = ((ss ?? []) as { id: string }[]).map((s) => s.id);
  } else if (a.scope === "class") {
    if (!a.target_class_ids?.length) studentIds = [];
    else {
      const { data: ss } = await supabase
        .from("students")
        .select("id")
        .eq("center_id", centerId)
        .in("class_id", a.target_class_ids);
      studentIds = ((ss ?? []) as { id: string }[]).map((s) => s.id);
    }
  } else {
    studentIds = a.target_student_ids ?? [];
  }
  studentIds = Array.from(new Set(studentIds));

  // 2. 학부모/학생 user 매칭
  let parents:
    | { student_id: string; parent: { id: string; phone: string | null } | null }[]
    | [] = [];
  let studAccts:
    | { student_id: string; account: { id: string; phone: string | null } | null }[]
    | [] = [];
  if (studentIds.length > 0) {
    if (a.audience === "parent_only" || a.audience === "parent_student") {
      const { data: ps } = await supabase
        .from("parent_student_links")
        .select("student_id, parent:users(id, phone)")
        .eq("center_id", centerId)
        .eq("status", "linked")
        .in("student_id", studentIds);
      parents = (ps ?? []) as unknown as typeof parents;
    }
    if (a.audience === "student_only" || a.audience === "parent_student") {
      const { data: sa } = await supabase
        .from("student_account_links")
        .select("student_id, account:users(id, phone)")
        .eq("center_id", centerId)
        .eq("status", "linked")
        .in("student_id", studentIds);
      studAccts = (sa ?? []) as unknown as typeof studAccts;
    }
  }

  // 3. notifications 큐 행 빌드
  const rows: Array<Record<string, unknown>> = [];
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
      template: `[공지] ${a.title}`,
      payload: {
        type: "announcement",
        announcement_id: a.id,
        title: a.title,
        body: a.body,
        target_role: role,
        target_user_id: u.id,
        target_student_id: studentId,
      },
      status: "대기",
    });
  }
  for (const p of parents) pushFor(p.student_id, p.parent, "parent");
  for (const s of studAccts) pushFor(s.student_id, s.account, "student");

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("notifications").insert(rows);
    if (insErr) throw new Error("알림 큐잉 실패: " + insErr.message);
  }

  const { error: updErr } = await supabase
    .from("announcements")
    .update({
      published_at: new Date().toISOString(),
      notified_count: rows.length,
    })
    .eq("id", id)
    .eq("center_id", centerId);
  if (updErr) throw new Error("공지 발행 갱신 실패: " + updErr.message);

  revalidatePath("/admin/announcements");
  revalidatePath("/admin/notifications");
  redirect(`/admin/announcements?id=${id}&published=${rows.length}`);
}

// 학생 1명에게 즉시 메시지 발송 — 학생 상세 모달에서 호출.
// announcements 테이블에 scope='students' + 1명 + 즉시 published 로 insert + notifications 큐 N행.
export async function sendStudentMessage(formData: FormData) {
  const { supabase, centerId, userId } = await requireCenter();
  const studentId = String(formData.get("student_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();
  const audience = parseAudience(String(formData.get("audience") ?? "parent_student"));
  if (!studentId) throw new Error("학생 ID 가 비어 있습니다.");
  if (!title || !body) throw new Error("제목·본문을 입력해 주세요.");

  // 학부모/학생 user 매칭
  const [{ data: parents }, { data: studAccts }] = await Promise.all([
    audience === "parent_only" || audience === "parent_student"
      ? supabase
          .from("parent_student_links")
          .select("parent:users(id, phone)")
          .eq("center_id", centerId)
          .eq("status", "linked")
          .eq("student_id", studentId)
      : Promise.resolve({ data: [] }),
    audience === "student_only" || audience === "parent_student"
      ? supabase
          .from("student_account_links")
          .select("account:users(id, phone)")
          .eq("center_id", centerId)
          .eq("status", "linked")
          .eq("student_id", studentId)
      : Promise.resolve({ data: [] }),
  ]);

  const now = new Date().toISOString();

  // announcement 행 (즉시 published)
  const { data: ann, error: annErr } = await supabase
    .from("announcements")
    .insert({
      center_id: centerId,
      title,
      body,
      scope: "students",
      audience,
      target_student_ids: [studentId],
      published_at: now,
      notified_count: 0,
      created_by: userId,
    })
    .select("id")
    .single();
  if (annErr) throw new Error("메시지 생성 실패: " + annErr.message);
  const annId = (ann as { id: string }).id;

  const rows: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();
  function pushFor(
    u: { id: string; phone: string | null } | null,
    role: "parent" | "student",
  ) {
    if (!u) return;
    if (seen.has(u.id)) return;
    seen.add(u.id);
    rows.push({
      center_id: centerId,
      kind: "push",
      recipient: u.phone ?? u.id,
      template: `[메시지] ${title}`,
      payload: {
        type: "student_message",
        announcement_id: annId,
        title,
        body,
        target_role: role,
        target_user_id: u.id,
        target_student_id: studentId,
        student_id: studentId,
      },
      status: "대기",
    });
  }
  for (const p of (parents ?? []) as unknown as {
    parent: { id: string; phone: string | null } | null;
  }[]) {
    pushFor(p.parent, "parent");
  }
  for (const s of (studAccts ?? []) as unknown as {
    account: { id: string; phone: string | null } | null;
  }[]) {
    pushFor(s.account, "student");
  }

  if (rows.length > 0) {
    const { error: insErr } = await supabase.from("notifications").insert(rows);
    if (insErr) throw new Error("알림 큐잉 실패: " + insErr.message);
  }

  await supabase
    .from("announcements")
    .update({ notified_count: rows.length })
    .eq("id", annId)
    .eq("center_id", centerId);

  revalidatePath("/admin/students");
  revalidatePath("/admin/announcements");
  revalidatePath("/admin/notifications");
  redirect(`/admin/students?student=${studentId}&msg_sent=${rows.length}`);
}

export async function deleteAnnouncement(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 가 비어 있습니다.");
  const { error } = await supabase
    .from("announcements")
    .delete()
    .eq("id", id)
    .eq("center_id", centerId);
  if (error) throw new Error("공지 삭제 실패: " + error.message);
  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}
