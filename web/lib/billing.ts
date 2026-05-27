import { requireCenter } from "./center";

const pad = (n: number) => String(n).padStart(2, "0");

// 해당 월의 '확정' 수강건 → 청구서 멱등 생성. 이미 같은 학생/월 청구서가 있으면 skip.
// 반환: 신규 생성된 청구서 수.
// 청구 관리 페이지 진입 시 자동 호출 + generateInvoices server action 둘 다 이걸 위임.
export async function ensureInvoicesForMonth(period: string): Promise<number> {
  if (!/^\d{4}-\d{2}$/.test(period)) return 0;
  const { supabase, centerId } = await requireCenter();

  const { data: center } = await supabase
    .from("centers")
    .select("billing_day")
    .eq("id", centerId)
    .single();
  const billingDay = (center as { billing_day: number } | null)?.billing_day ?? 10;
  const dueDate = `${period}-${pad(Math.min(billingDay, 28))}`;

  const { data: confirmed } = await supabase
    .from("renewal_confirmations")
    .select("enrollment_id, enrollments(student_id, products(name, price))")
    .eq("center_id", centerId)
    .eq("target_month", period)
    .eq("status", "확정");

  const rows = (confirmed ?? []) as unknown as {
    enrollment_id: string;
    enrollments: {
      student_id: string;
      products: { name: string; price: number } | null;
    } | null;
  }[];

  const { data: exist } = await supabase
    .from("invoices")
    .select("student_id")
    .eq("center_id", centerId)
    .eq("period", period);
  const billed = new Set((exist ?? []).map((i) => i.student_id));

  let created = 0;
  for (const r of rows) {
    const e = r.enrollments;
    if (!e || billed.has(e.student_id)) continue;
    const amount = e.products?.price ?? 0;
    const { data: inv, error } = await supabase
      .from("invoices")
      .insert({
        center_id: centerId,
        student_id: e.student_id,
        period,
        amount,
        status: "청구",
        source: "수강확인",
        due_date: dueDate,
        issued_at: new Date().toISOString(),
      })
      .select("id")
      .single();
    if (error) throw new Error("청구 생성 실패: " + error.message);
    await supabase.from("invoice_items").insert({
      center_id: centerId,
      invoice_id: (inv as { id: string }).id,
      enrollment_id: r.enrollment_id,
      label: e.products?.name ?? "수강료",
      amount,
    });
    billed.add(e.student_id);
    created++;
  }
  return created;
}

// 청구 관리 페이지의 자동 대상월 결정 — renewal_check_day 기준.
// today.day >= renewal_check_day 이면 다음달 (학부모가 다음달 수강 응답 시작), 아니면 이번달.
// renewal_check_day 미설정인 센터는 이번달 fallback.
export function resolveBillingMonth(
  renewalCheckDay: number | null,
  today: Date = new Date(),
): { period: string; isNextCycle: boolean } {
  const day = today.getDate();
  const useNext = renewalCheckDay != null && day >= renewalCheckDay;
  const base = useNext
    ? new Date(today.getFullYear(), today.getMonth() + 1, 1)
    : today;
  return {
    period: `${base.getFullYear()}-${pad(base.getMonth() + 1)}`,
    isNextCycle: useNext,
  };
}
