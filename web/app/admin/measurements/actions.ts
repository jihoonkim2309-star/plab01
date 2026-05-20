"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter, requireStaff } from "@/lib/center";

// 학생+월 기준 measurement 행 보장(없으면 생성)
async function ensure(
  supabase: Awaited<ReturnType<typeof requireStaff>>["supabase"],
  centerId: string,
  studentId: string,
  ym: string,
) {
  const { data } = await supabase
    .from("measurements")
    .select("id, status, center_id")
    .eq("student_id", studentId)
    .eq("measurement_month", ym)
    .maybeSingle();
  if (data) return data;
  const ins = await supabase
    .from("measurements")
    .insert({
      center_id: centerId,
      student_id: studentId,
      measurement_month: ym,
      status: "대기",
    })
    .select("id, status, center_id")
    .single();
  if (ins.error) throw new Error("측정 생성 실패: " + ins.error.message);
  return ins.data;
}

// 항목별 값 저장. 빈 입력은 해당 행 삭제. 메모도 함께 저장.
export async function saveMeasurement(formData: FormData) {
  const { supabase, centerId, role } = await requireStaff();
  const studentId = String(formData.get("student_id") ?? "");
  const ym = String(formData.get("ym") ?? "");
  if (!studentId || !ym) throw new Error("학생/측정월 필수");

  const m = await ensure(supabase, centerId, studentId, ym);
  if (m.status === "승인완료" && role !== "admin") {
    throw new Error("승인 완료된 측정은 어드민만 수정할 수 있습니다.");
  }

  const { data: items } = await supabase
    .from("measurement_items")
    .select("id, value_kind, active")
    .eq("center_id", centerId);

  const upserts: {
    measurement_id: string;
    item_id: string;
    value_num: number | null;
    value_text: string | null;
  }[] = [];
  const deletes: string[] = [];
  for (const it of items ?? []) {
    if (!it.active) continue;
    const raw = formData.get(`v_${it.id}`);
    const s = raw == null ? "" : String(raw).trim();
    if (s === "") {
      deletes.push(it.id);
    } else if (it.value_kind === "number") {
      const n = Number(s);
      if (!Number.isNaN(n)) {
        upserts.push({
          measurement_id: m.id,
          item_id: it.id,
          value_num: n,
          value_text: null,
        });
      }
    } else {
      upserts.push({
        measurement_id: m.id,
        item_id: it.id,
        value_num: null,
        value_text: s,
      });
    }
  }
  if (upserts.length) {
    const { error } = await supabase
      .from("measurement_values")
      .upsert(upserts, { onConflict: "measurement_id,item_id" });
    if (error) throw new Error("값 저장 실패: " + error.message);
  }
  if (deletes.length) {
    const { error } = await supabase
      .from("measurement_values")
      .delete()
      .eq("measurement_id", m.id)
      .in("item_id", deletes);
    if (error) throw new Error("빈 값 정리 실패: " + error.message);
  }

  const notes = formData.get("notes");
  await supabase
    .from("measurements")
    .update({ notes: notes ? String(notes).trim() || null : null })
    .eq("id", m.id);

  revalidatePath("/admin/measurements");
}

export async function submitMeasurement(formData: FormData) {
  const { supabase, userId } = await requireStaff();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const { error } = await supabase
    .from("measurements")
    .update({
      status: "입력완료",
      measured_by: userId,
      measured_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) throw new Error("입력완료 처리 실패: " + error.message);
  revalidatePath("/admin/measurements");
}

export async function approveMeasurement(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("measurements")
    .update({
      status: "승인완료",
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      reject_reason: null,
    })
    .eq("id", id);
  if (error) throw new Error("승인 처리 실패: " + error.message);
  revalidatePath("/admin/measurements");
}

export async function rejectMeasurement(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reject_reason") ?? "").trim() || null;
  if (!id) throw new Error("id 필수");
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("measurements")
    .update({
      status: "반려",
      reviewed_by: user?.id ?? null,
      reviewed_at: new Date().toISOString(),
      reject_reason: reason,
    })
    .eq("id", id);
  if (error) throw new Error("반려 처리 실패: " + error.message);
  revalidatePath("/admin/measurements");
}

export async function reopenMeasurement(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("id 필수");
  const { error } = await supabase
    .from("measurements")
    .update({
      status: "대기",
      reviewed_by: null,
      reviewed_at: null,
      reject_reason: null,
    })
    .eq("id", id);
  if (error) throw new Error("재개 실패: " + error.message);
  revalidatePath("/admin/measurements");
}

export async function deleteMeasurement(formData: FormData) {
  const { supabase } = await requireCenter();
  const id = String(formData.get("id") ?? "");
  const ym = String(formData.get("ym") ?? "");
  if (!id) throw new Error("id 필수");
  const { error } = await supabase.from("measurements").delete().eq("id", id);
  if (error) throw new Error("삭제 실패: " + error.message);
  revalidatePath("/admin/measurements");
  redirect(`/admin/measurements${ym ? `?ym=${ym}` : ""}`);
}
