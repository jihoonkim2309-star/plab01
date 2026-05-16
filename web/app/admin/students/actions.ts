"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const FIELDS = [
  "name",
  "gender",
  "birth",
  "school",
  "grade",
  "sport",
  "level",
  "status",
  "class_name",
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

async function requireCenterId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("center_id, role")
    .eq("id", user.id)
    .single();

  if (!profile?.center_id || profile.role !== "admin") {
    throw new Error(
      "센터/권한이 설정되지 않았습니다. 부트스트랩 SQL을 먼저 실행하세요.",
    );
  }
  return { supabase, centerId: profile.center_id as string };
}

export async function createStudent(formData: FormData) {
  const { supabase, centerId } = await requireCenterId();
  const row = readForm(formData);
  if (!row.name) throw new Error("학생명은 필수입니다.");

  const { error } = await supabase
    .from("students")
    .insert({ ...row, center_id: centerId });
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}

export async function updateStudent(id: string, formData: FormData) {
  const { supabase } = await requireCenterId();
  const row = readForm(formData);
  if (!row.name) throw new Error("학생명은 필수입니다.");

  const { error } = await supabase.from("students").update(row).eq("id", id);
  if (error) throw new Error("수정 실패: " + error.message);

  revalidatePath("/admin/students");
  revalidatePath(`/admin/students/${id}`);
  redirect(`/admin/students/${id}`);
}

export async function deleteStudent(id: string) {
  const { supabase } = await requireCenterId();
  const { error } = await supabase.from("students").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);

  revalidatePath("/admin/students");
  redirect("/admin/students");
}
