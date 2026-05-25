import { requireCenter } from "@/lib/center";
import AccountsView, { type AccountRow } from "../AccountsView";

export default async function DriverAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("users")
    .select("id, name, email, phone, created_at")
    .eq("center_id", cid)
    .eq("role", "driver")
    .order("created_at", { ascending: false });
  if (q) {
    listQuery = listQuery.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const [listRes, allRes, runsRes] = await Promise.all([
    listQuery,
    supabase.from("users").select("id").eq("center_id", cid).eq("role", "driver"),
    supabase
      .from("shuttle_runs")
      .select("driver_user_id, shuttle_routes(name)")
      .eq("center_id", cid),
  ]);

  // 기사별 담당 운행 (노선 이름 목록)
  type RunRow = {
    driver_user_id: string | null;
    shuttle_routes: { name: string } | null;
  };
  const byDriver = new Map<string, Set<string>>();
  for (const r of (runsRes.data ?? []) as unknown as RunRow[]) {
    if (r.driver_user_id) {
      const set = byDriver.get(r.driver_user_id) ?? new Set<string>();
      if (r.shuttle_routes?.name) set.add(r.shuttle_routes.name);
      byDriver.set(r.driver_user_id, set);
    }
  }

  const rows: AccountRow[] = (listRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: (u as { phone: string | null }).phone,
    createdAt: u.created_at,
    extra: [...(byDriver.get(u.id) ?? [])].join(", ") || "배정 없음",
  }));

  const totalDrivers = (allRes.data ?? []).length;
  const assignedDrivers = new Set(byDriver.keys()).size;
  const unassignedDrivers = totalDrivers - assignedDrivers;

  return (
    <AccountsView
      title="기사 계정 관리"
      subtitle="셔틀 기사 계정 및 담당 노선 (배정은 셔틀 운행 일정에서)"
      extraLabel="담당 노선"
      rows={rows}
      q={q}
      showPhone
      resetHref="/admin/driver-accounts"
      totals={{
        total: totalDrivers,
        extraCounts: [
          { label: "담당 있음", value: assignedDrivers },
          { label: "배정 없음", value: unassignedDrivers },
        ],
      }}
    />
  );
}
