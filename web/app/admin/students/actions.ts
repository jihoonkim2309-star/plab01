"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";
import type { SupabaseClient } from "@supabase/supabase-js";

const FIELDS = [
  "name",
  "gender",
  "birth",
  "school",
  "grade",
  "status",
  "class_id",
  "product_id",
  "attendance_days",
  "caution",
  "memo",
  // 신규 — 학생 본인 연락처·주소
  "phone",
  "address",
  // 보호자 참조 연락처 (어드민 입력용; 포털 가입 학부모는 parent_student_links 로 별도 연결)
  "parent1_name",
  "parent1_phone",
  "parent2_name",
  "parent2_phone",
] as const;

function readForm(formData: FormData) {
  const row: Record<string, string | null> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    row[f] = v === null || v === "" ? null : String(v);
  }
  return row;
}

// 학생 기본정보·보호자 1 필수 검증. 클라이언트 HTML required 우회 케이스 대비.
const REQUIRED_LABELS: [string, string][] = [
  ["name", "학생명"],
  ["birth", "생년월일"],
  ["gender", "성별"],
  ["school", "학교"],
  ["grade", "학년"],
  ["status", "회원 상태"],
  ["phone", "학생 연락처"],
  ["address", "주소"],
  ["parent1_name", "보호자 1 이름"],
  ["parent1_phone", "보호자 1 연락처"],
];

function validateRequired(row: Record<string, string | null>) {
  const missing = REQUIRED_LABELS
    .filter(([k]) => !row[k])
    .map(([, label]) => label);
  if (missing.length > 0) {
    throw new Error(`필수 항목을 입력해 주세요: ${missing.join(", ")}`);
  }
}

// 선택한 클래스/상품의 이름을 비정규화 컬럼(class_name/product)에 저장 (목록·상세 표시용).
async function denormalize(
  supabase: SupabaseClient,
  row: Record<string, string | null>,
): Promise<Record<string, string | null>> {
  const out = { ...row, class_name: null as string | null, product: null as string | null };
  if (row.class_id) {
    const { data } = await supabase
      .from("classes")
      .select("name")
      .eq("id", row.class_id)
      .single();
    out.class_name = (data as { name: string } | null)?.name ?? null;
  }
  if (row.product_id) {
    const { data } = await supabase
      .from("products")
      .select("name")
      .eq("id", row.product_id)
      .single();
    out.product = (data as { name: string } | null)?.name ?? null;
  }
  return out;
}

// 폼에 staged 된 사진 변경(파일 첨부 / 삭제) 일괄 적용. [저장] 시점에만 호출.
async function applyPhotoChanges(
  supabase: Awaited<ReturnType<typeof requireCenter>>["supabase"],
  studentId: string,
  formData: FormData,
) {
  const file = formData.get("photo_file");
  const action = String(formData.get("photo_action") ?? "");
  const hasNewFile = file instanceof File && file.size > 0;

  if (hasNewFile) {
    const f = file as File;
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${studentId}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("student-photos")
      .upload(path, f, { upsert: true, contentType: f.type });
    if (upErr) return;
    const { data: pub } = supabase.storage
      .from("student-photos")
      .getPublicUrl(path);
    await supabase
      .from("students")
      .update({ photo_url: pub.publicUrl })
      .eq("id", studentId);
    return;
  }
  if (action === "remove") {
    await supabase
      .from("students")
      .update({ photo_url: null })
      .eq("id", studentId);
    return;
  }
  // 변경 없음 → no-op
}

export async function createStudent(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const formRow = readForm(formData);
  validateRequired(formRow);
  const row = await denormalize(supabase, formRow);

  const { data: created, error } = await supabase
    .from("students")
    .insert({ ...row, center_id: centerId })
    .select("id")
    .single();
  if (error) throw new Error("등록 실패: " + error.message);

  if (created?.id) await applyPhotoChanges(supabase, created.id, formData);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function updateStudent(id: string, formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const formRow = readForm(formData);
  validateRequired(formRow);
  const row = await denormalize(supabase, formRow);

  const { error } = await supabase.from("students").update(row).eq("id", id);
  if (error) throw new Error("수정 실패: " + error.message);

  // 탈퇴 처리 시 활성 enrollment 자동 종료
  if (row.status === "탈퇴") {
    await supabase
      .from("enrollments")
      .update({ status: "종료" })
      .eq("center_id", centerId)
      .eq("student_id", id)
      .eq("status", "수강중");
  }

  await applyPhotoChanges(supabase, id, formData);

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}`);
}

export async function uploadStudentPhoto(id: string, formData: FormData) {
  const { supabase } = await requireCenter();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0)
    return { ok: false, error: "파일이 없습니다." };

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
  const path = `${id}/${Date.now()}.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("student-photos")
    .upload(path, file, { upsert: true, contentType: file.type });
  if (upErr) return { ok: false, error: "업로드 실패: " + upErr.message };

  const { data: pub } = supabase.storage
    .from("student-photos")
    .getPublicUrl(path);

  const { error } = await supabase
    .from("students")
    .update({ photo_url: pub.publicUrl })
    .eq("id", id);
  if (error) return { ok: false, error: "저장 실패: " + error.message };

  revalidatePath(`/admin/students/${id}/edit`);
  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/admin/students");
  return { ok: true, url: pub.publicUrl };
}

// 학생 사진 제거 (photo_url 비우기). Storage 파일은 보존(상시 회전 비용 절감).
export async function removeStudentPhoto(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase
    .from("students")
    .update({ photo_url: null })
    .eq("id", id);
  if (error) return { ok: false, error: "삭제 실패: " + error.message };
  revalidatePath(`/admin/students/${id}/edit`);
  revalidatePath(`/admin/students/${id}`);
  revalidatePath("/admin/students");
  return { ok: true };
}

export async function deleteStudent(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
