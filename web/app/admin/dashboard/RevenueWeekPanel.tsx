import Link from "next/link";
import dynamic from "next/dynamic";
import { requireCenter } from "@/lib/center";
import ChartSkeleton from "./ChartSkeleton";

const RevenueAreaChart = dynamic(() => import("./RevenueAreaChart"), {
  loading: () => <ChartSkeleton height={240} />,
});

// 최근 7일 일별 수납액 panel — 자체 payments 쿼리.
export default async function RevenueWeekPanel() {
  const { supabase, centerId: cid } = await requireCenter();
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 6);
  const sevenAgoIso = sevenDaysAgo.toISOString().slice(0, 10);
  const todayIso = now.toISOString().slice(0, 10);

  const { data } = await supabase
    .from("payments")
    .select("amount, paid_at")
    .eq("center_id", cid)
    .eq("status", "성공")
    .gte("paid_at", `${sevenAgoIso}T00:00:00`)
    .lte("paid_at", `${todayIso}T23:59:59`);

  const week = (data ?? []) as { amount: number; paid_at: string }[];
  const days: { date: string; amount: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const sum = week
      .filter((p) => p.paid_at?.startsWith(key))
      .reduce((a, b) => a + Number(b.amount), 0);
    days.push({ date: key, amount: sum });
  }

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">최근 7일 수납 추이</p>
        <Link className="panel-action" href="/admin/payment-status">
          결제 상태 →
        </Link>
      </div>
      <div className="panel-body">
        <RevenueAreaChart data={days} />
      </div>
    </div>
  );
}
