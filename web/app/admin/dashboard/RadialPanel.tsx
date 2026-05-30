import Link from "next/link";
import { requireCenter } from "@/lib/center";
import RadialRevenueChart from "./RadialRevenueChart";

const fmtKRW = (n: number) => `${Math.round(n).toLocaleString()}원`;

// 이번 달 수납 진행도 panel — 자체 invoice 쿼리. Suspense 경계 안에서 동작.
export default async function RadialPanel({ period }: { period: string }) {
  const { supabase, centerId: cid } = await requireCenter();
  const { data } = await supabase
    .from("invoices")
    .select("amount, status")
    .eq("center_id", cid)
    .eq("period", period);
  const list = data ?? [];
  const monthPaid = list
    .filter((i) => i.status === "결제완료")
    .reduce((a, b) => a + Number(b.amount), 0);
  const monthBilledOutstanding = list
    .filter((i) => i.status === "청구" || i.status === "실패")
    .reduce((a, b) => a + Number(b.amount), 0);
  const radialTarget = monthPaid + monthBilledOutstanding;
  const monthPct = radialTarget > 0 ? (monthPaid / radialTarget) * 100 : 0;
  const radialOutstanding = Math.max(0, radialTarget - monthPaid);

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">이번 달 수납 진행도</p>
        <Link className="panel-action" href="/admin/billing">
          청구 →
        </Link>
      </div>
      <div className="panel-body">
        <RadialRevenueChart
          percent={monthPct}
          paid={monthPaid}
          target={radialTarget}
        />
        {radialOutstanding > 0 && (
          <div
            className="muted"
            style={{ textAlign: "center", fontSize: 12, marginTop: 6 }}
          >
            미수납 {fmtKRW(radialOutstanding)}
          </div>
        )}
      </div>
    </div>
  );
}
