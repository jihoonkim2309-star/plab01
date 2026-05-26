"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

const FIELDS = [
  "name",
  "sport",
  "level",
  "capacity",
  "coach",
  "coach_id",
  "start_time",
  "end_time",
  "place",
  "status",
  "color",
] as const;

function readForm(formData: FormData) {
  const row: Record<string, string | number | null> = {};
  for (const f of FIELDS) {
    const v = formData.get(f);
    if (f === "capacity") {
      row[f] = v ? Number(v) : null;
    } else {
      row[f] = v === null || v === "" ? null : String(v);
    }
  }
  // 요일 다중 선택 → "월,수,금"
  const days = formData.getAll("days").map(String).filter(Boolean);
  row.days_of_week = days.length ? days.join(",") : null;
  // 표시용 일정 텍스트 (목록/학생폼 등에서 재사용)
  const t =
    row.start_time && row.end_time
      ? ` ${row.start_time}~${row.end_time}`
      : "";
  row.schedule = days.length ? `${days.join("·")}${t}` : null;
  return row;
}

export async function createClass(formData: FormData) {
  const { supabase, centerId } = await requireCenter();
  const row = readForm(formData);
  if (!row.name) throw new Error("클래스명은 필수입니다.");

  const { error } = await supabase
    .from("classes")
    .insert({ ...row, center_id: centerId });
  if (error) throw new Error("등록 실패: " + error.message);

  revalidatePath("/admin/classes");
  redirect("/admin/classes");
}

export async function updateClass(id: string, formData: FormData) {
  const { supabase } = await requireCenter();
  const row = readForm(formData);
  if (!row.name) throw new Error("클래스명은 필수입니다.");

  const { error } = await supabase.from("classes").update(row).eq("id", id);
  if (error) throw new Error("수정 실패: " + error.message);

  revalidatePath("/admin/classes");
  redirect("/admin/classes");
}

export async function deleteClass(id: string) {
  const { supabase } = await requireCenter();
  const { error } = await supabase.from("classes").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);

  revalidatePath("/admin/classes");
  redirect("/admin/classes");
}
