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
  "sport",
  "level",
  "status",
  "class_id",
  "product",
  "shuttle_use",
  "route",
  "caution",
  "memo",
] as const;

function readForm(formData: FormData) {
  const row: Record<string, string | null> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    row[f] = v === null || v === "" ? null : String(v);
  }
  return row;
}

// 선택한 클래스의 이름을 class_name 에 비정규화 저장 (목록/상세 표시용).
async function withClassName(
  supabase: SupabaseClient,
  row: Record<string, string | null>,
): Promise<Record<string, string | null>> {
  if (row.class_id) {
    const { data: cls } = await supabase
      .from("classes")
      .select("name")
      .eq("id", row.class_id)
      .single();
    const name = (cls as { name: string } | null)?.name ?? null;
    return { ...row, class_name: name };
  }
  return { ...row, class_name: null };
}

export async function createStudent(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = await withClassName(supabase, readForm(formData));
  if (!row.name) throw new Error("학생명은 필수입니다.");

  const { error } = await supabase
    .from("students")
    .insert({ ...row, center_id: centerId });
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function updateStudent(id: string, formData: FormData) {
  const { supabase } = await requireCenter();
  const row = await withClassName(supabase, readForm(formData));
  if (!row.name) throw new Error("학생명은 필수입니다.");

  const { error } = await supabase.from("students").update(row).eq("id", id);
  if (error) throw new Error("수정 실패: " + error.message);

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}`);
}

export async function deleteStudent(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
