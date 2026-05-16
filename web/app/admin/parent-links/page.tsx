import { createClient } from "@/lib/supabase/server";
import LinksView, { type LinkRow } from "../LinksView";

export default async function ParentLinksPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("parent_student_links")
    .select(
      "id, status, students(name), parent:users!parent_id(name, email)",
    )
    .order("created_at", { ascending: false });

  const rows: LinkRow[] = (data ?? []).map((r) => {
    const rec = r as unknown as {
      id: string;
      status: string;
      students: { name: string } | null;
      parent: { name: string | null; email: string | null } | null;
    };
    return {
      id: rec.id,
      status: rec.status,
      studentName: rec.students?.name ?? null,
      whoName: rec.parent?.name ?? null,
      whoSub: rec.parent?.email ?? null,
    };
  });

  return (
    <LinksView
      title="자녀 연결 승인"
      subtitle="학부모 ↔ 학생 연결 요청 검토 (학부모 포털 단계에서 요청 유입)"
      table="parent_student_links"
      whoLabel="학부모"
      rows={rows}
    />
  );
}
