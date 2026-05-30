import { requireCenter } from "./center";

// 학생에 수강료 상품(product_id) 이 지정됐는데 활성 enrollment 없는 학생 → 자동 보충.
// 청구 관리·리포트 관리의 ensureInvoicesForMonth / ensureReportsForMonth 와 같은 멱등 패턴.
// 수강 확인 페이지 진입 시 자동 호출 → 별도 [수강 등록 동기화] 버튼 불필요.
// 반환: 신규 생성된 enrollment 수.
export async function ensureEnrollmentsForCenter(): Promise<number> {
  const { supabase, centerId } = await requireCenter();

  const { data: studs } = await supabase
    .from("students")
    .select("id, class_id, product_id, attendance_days")
    .eq("center_id", centerId)
    .not("product_id", "is", null);

  if (!studs || studs.length === 0) return 0;

  const { data: existing } = await supabase
    .from("enrollments")
    .select("student_id")
    .eq("center_id", centerId)
    .eq("status", "수강중");
  const have = new Set((existing ?? []).map((e) => e.student_id));

  const rows = studs
    .filter((s) => !have.has(s.id))
    .map((s) => ({
      center_id: centerId,
      student_id: s.id,
      class_id: s.class_id,
      product_id: s.product_id,
      attendance_days: s.attendance_days,
      status: "수강중",
    }));

  if (rows.length === 0) return 0;

  const { error } = await supabase.from("enrollments").insert(rows);
  if (error) throw new Error("수강 등록 보충 실패: " + error.message);
  return rows.length;
}
