"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 학생 수강 배정 — 학생 마스터의 class/product/attendance_days 갱신 +
// active enrollment 행 생성/갱신 (학생당 단일 enrollment 가정).
// formData:
//   student_id (required)
//   class_id   (required)
//   attendance_days (csv, optional)
//   product_id (optional, attendance_days.length 와 매칭되는 상품 자동 추천)
//   back (선택) — 저장 후 돌아갈 페이지
export async function assignEnrollment(formData: FormData) {
  const { supabase, centerId } = await requireCenter();

  const studentId = String(formData.get("student_id") ?? "").trim();
  const classId = String(formData.get("class_id") ?? "").trim();
  const attendanceDays = String(formData.get("attendance_days") ?? "").trim() || null;
  const productId = String(formData.get("product_id") ?? "").trim() || null;
  const backRaw = String(formData.get("back") ?? "").trim();
  const back = backRaw.startsWith("/admin/") ? backRaw : "/admin/students";

  if (!studentId) throw new Error("학생이 선택되지 않았습니다.");
  if (!classId) throw new Error("클래스가 선택되지 않았습니다.");

  // 클래스·상품 비정규화 데이터 (목록 표시용)
  const [{ data: cls }, { data: prod }] = await Promise.all([
    supabase
      .from("classes")
      .select("id, name")
      .eq("center_id", centerId)
      .eq("id", classId)
      .maybeSingle(),
    productId
      ? supabase
          .from("products")
          .select("id, name")
          .eq("center_id", centerId)
          .eq("id", productId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);
  if (!cls) throw new Error("클래스를 찾을 수 없습니다.");

  // 1) 학생 마스터 갱신
  const { error: studErr } = await supabase
    .from("students")
    .update({
      class_id: classId,
      product_id: productId,
      attendance_days: attendanceDays,
      class_name: (cls as { name: string }).name,
      product: (prod as { name: string } | null)?.name ?? null,
    })
    .eq("center_id", centerId)
    .eq("id", studentId);
  if (studErr) throw new Error("학생 갱신 실패: " + studErr.message);

  // 2) 활성 enrollment 가 있으면 갱신, 없으면 신규 생성
  const { data: existing } = await supabase
    .from("enrollments")
    .select("id")
    .eq("center_id", centerId)
    .eq("student_id", studentId)
    .eq("status", "수강중")
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("enrollments")
      .update({
        class_id: classId,
        product_id: productId,
        attendance_days: attendanceDays,
      })
      .eq("id", (existing as { id: string }).id)
      .eq("center_id", centerId);
    if (error) throw new Error("수강 등록 갱신 실패: " + error.message);
  } else {
    const { error } = await supabase.from("enrollments").insert({
      center_id: centerId,
      student_id: studentId,
      class_id: classId,
      product_id: productId,
      attendance_days: attendanceDays,
      status: "수강중",
    });
    if (error) throw new Error("수강 등록 생성 실패: " + error.message);
  }

  revalidatePath("/admin/classes");
  revalidatePath("/admin/students");
  revalidatePath("/admin/schedule");
  revalidatePath(`/admin/students/${studentId}`);
  redirect(back);
}
