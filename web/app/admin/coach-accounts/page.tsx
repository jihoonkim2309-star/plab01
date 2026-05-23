import { requireCenter } from "@/lib/center";
import AccountsView, { type AccountRow } from "../AccountsView";

export default async function CoachAccountsPage({
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
    .eq("role", "coach")
    .order("created_at", { ascending: false });
  if (q) {
    listQuery = listQuery.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const [listRes, allRes, classesRes] = await Promise.all([
    listQuery,
    supabase.from("users").select("id").eq("center_id", cid).eq("role", "coach"),
    supabase.from("classes").select("name, coach_id").eq("center_id", cid),
  ]);

  const byCoach = new Map<string, string[]>();
  for (const c of classesRes.data ?? []) {
    if (c.coach_id) {
      const arr = byCoach.get(c.coach_id) ?? [];
      arr.push(c.name as string);
      byCoach.set(c.coach_id, arr);
    }
  }

  const rows: AccountRow[] = (listRes.data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    phone: (u as { phone: string | null }).phone,
    createdAt: u.created_at,
    extra: byCoach.get(u.id)?.join(", ") ?? "배정 없음",
  }));

  const totalCoaches = (allRes.data ?? []).length;
  const assignedCoaches = new Set(byCoach.keys()).size;
  const unassignedCoaches = totalCoaches - assignedCoaches;

  return (
    <AccountsView
      title="코치 계정 관리"
      subtitle="코치 계정 및 담당 클래스 (클래스 배정은 클래스 관리에서)"
      extraLabel="담당 클래스"
      rows={rows}
      q={q}
      showPhone
      resetHref="/admin/coach-accounts"
      totals={{
        total: totalCoaches,
        extraCounts: [
          { label: "담당 있음", value: assignedCoaches },
          { label: "배정 없음", value: unassignedCoaches },
        ],
      }}
    />
  );
}
