import { requireCenter } from "./center";
import { buildSnapshot } from "@/app/admin/reports/snapshot";

// 그 달 측정 승인완료 학생당 "월간" 리포트 행 보장 (멱등).
// 리포트 관리 페이지 진입 시 자동 호출 — 청구 관리의 ensureInvoicesForMonth 와 같은 패턴.
// - 발행완료 리포트는 보존 (frozen, 학부모에게 노출된 동결본)
// - 발행 전 리포트는 snapshot 최신 측정값으로 갱신
// - 리포트 없으면 새로 insert
// - 구버전 4종 (신체성장/기록/체력측정/배드민턴측정) 중 발행완료 아닌 것 정리
// 반환: 신규 생성된 리포트 수.
export async function ensureReportsForMonth(ym: string): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(ym)) return 0;
  const { supabase, centerId } = await requireCenter();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 구버전 리포트 정리 (발행완료가 아닌 것만)
  await supabase
    .from("reports")
    .delete()
    .eq("center_id", centerId)
    .eq("report_month", ym)
    .in("report_type", ["신체성장", "기록", "체력측정", "배드민턴측정"])
    .neq("status", "발행완료");

  const { data: approved } = await supabase
    .from("measurements")
    .select("id, student_id")
    .eq("center_id", centerId)
    .eq("measurement_month", ym)
    .eq("status", "승인완료");

  if (!approved || approved.length === 0) return 0;

  const { data: existing } = await supabase
    .from("reports")
    .select("id, student_id, status")
    .eq("center_id", centerId)
    .eq("report_month", ym)
    .eq("report_type", "월간");
  const existingByStudent = new Map(
    (existing ?? []).map((r) => [r.student_id, r]),
  );

  let created = 0;
  for (const m of approved) {
    const ex = existingByStudent.get(m.student_id);
    if (ex?.status === "발행완료") continue;

    const { snapshot } = await buildSnapshot(supabase, m.student_id, ym, centerId);
    if (ex) {
      const { error } = await supabase
        .from("reports")
        .update({ snapshot, measurement_id: m.id, status: "생성완료" })
        .eq("id", ex.id);
      if (error) throw new Error("리포트 갱신 실패: " + error.message);
    } else {
      const { error } = await supabase.from("reports").insert({
        center_id: centerId,
        student_id: m.student_id,
        measurement_id: m.id,
        report_month: ym,
        report_type: "월간",
        status: "생성완료",
        snapshot,
        generated_by: user?.id ?? null,
      });
      if (error) throw new Error("리포트 생성 실패: " + error.message);
      created++;
    }
  }
  return created;
}
