import { createClient } from "@/lib/supabase/server";
import LinksView, { type LinkRow } from "../LinksView";

export default async function StudentLinksPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("student_account_links")
    .select(
      "id, status, students(name), account:users!user_id(name, email)",
    )
    .order("created_at", { ascending: false });

  const rows: LinkRow[] = (data ?? []).map((r) => {
    const rec = r as unknown as {
      id: string;
      status: string;
      students: { name: string } | null;
      account: { name: string | null; email: string | null } | null;
    };
    return {
      id: rec.id,
      status: rec.status,
      studentName: rec.students?.name ?? null,
      whoName: rec.account?.name ?? null,
      whoSub: rec.account?.email ?? null,
    };
  });

  return (
    <LinksView
      title="학생 연결 승인"
      subtitle="학생 본인 계정 ↔ 학생 레코드 연결 요청 검토 (학생 포털 단계에서 유입)"
      table="student_account_links"
      whoLabel="학생 계정"
      rows={rows}
    />
  );
}
