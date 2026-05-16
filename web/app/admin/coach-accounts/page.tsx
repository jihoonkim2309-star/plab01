import { createClient } from "@/lib/supabase/server";
import AccountsView, { type AccountRow } from "../AccountsView";

export default async function CoachAccountsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, name, email, created_at")
    .eq("role", "coach")
    .order("created_at", { ascending: false });

  const { data: classes } = await supabase
    .from("classes")
    .select("name, coach_id");

  const byCoach = new Map<string, string[]>();
  for (const c of classes ?? []) {
    if (c.coach_id) {
      const arr = byCoach.get(c.coach_id) ?? [];
      arr.push(c.name as string);
      byCoach.set(c.coach_id, arr);
    }
  }

  const rows: AccountRow[] = (data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.created_at,
    extra: byCoach.get(u.id)?.join(", ") ?? "배정 없음",
  }));

  return (
    <AccountsView
      title="코치 계정 관리"
      subtitle="코치 계정 및 담당 클래스 (클래스 배정은 클래스 관리에서)"
      extraLabel="담당 클래스"
      rows={rows}
    />
  );
}
