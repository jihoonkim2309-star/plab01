import Link from "next/link";
import { requireCenter } from "@/lib/center";
import MembersDonutChart from "./MembersDonutChart";

// 회원 상태 분포 panel — 자체 students status count 쿼리 (4개 head:true 병렬).
export default async function MembersPanel() {
  const { supabase, centerId: cid } = await requireCenter();
  const [normalRes, consultRes, leaveRes, withdrawnRes] = await Promise.all([
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("center_id", cid)
      .eq("status", "정상"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("center_id", cid)
      .eq("status", "상담중"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("center_id", cid)
      .eq("status", "휴원"),
    supabase
      .from("students")
      .select("*", { count: "exact", head: true })
      .eq("center_id", cid)
      .eq("status", "탈퇴"),
  ]);

  return (
    <div className="panel">
      <div className="panel-head">
        <p className="panel-title">회원 상태 분포</p>
        <Link className="panel-action" href="/admin/students">
          회원 목록 →
        </Link>
      </div>
      <div className="panel-body">
        <MembersDonutChart
          active={normalRes.count ?? 0}
          consulting={consultRes.count ?? 0}
          leave={leaveRes.count ?? 0}
          withdrawn={withdrawnRes.count ?? 0}
        />
      </div>
    </div>
  );
}
