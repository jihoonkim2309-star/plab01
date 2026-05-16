import { createClient } from "@/lib/supabase/server";
import AccountsView, { type AccountRow } from "../AccountsView";

export default async function StudentAccountsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("users")
    .select("id, name, email, created_at")
    .eq("role", "student")
    .order("created_at", { ascending: false });

  const rows: AccountRow[] = (data ?? []).map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    createdAt: u.created_at,
  }));

  return (
    <AccountsView
      title="학생 계정 관리"
      subtitle="학생 본인 앱 계정 (가입·연결요청은 학생 포털 단계에서 유입)"
      rows={rows}
    />
  );
}
