import { requireCenter } from "@/lib/center";
import LinksView, { type LinkRow } from "../LinksView";

export default async function StudentLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  let listQuery = supabase
    .from("student_account_links")
    .select(
      "id, status, created_at, student_id, students(name), account:users!user_id(name, email)",
    )
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, totalsRes] = await Promise.all([
    listQuery,
    supabase.from("student_account_links").select("status").eq("center_id", cid),
  ]);

  type RawRow = {
    id: string;
    status: string;
    created_at: string | null;
    student_id: string | null;
    students: { name: string } | null;
    account: { name: string | null; email: string | null } | null;
  };

  let raw = (listRes.data ?? []) as unknown as RawRow[];
  if (q) {
    const needle = q.toLowerCase();
    raw = raw.filter((r) => {
      const s = (r.students?.name ?? "").toLowerCase();
      const an = (r.account?.name ?? "").toLowerCase();
      const ae = (r.account?.email ?? "").toLowerCase();
      return s.includes(needle) || an.includes(needle) || ae.includes(needle);
    });
  }

  const rows: LinkRow[] = raw.map((r) => ({
    id: r.id,
    status: r.status,
    studentId: r.student_id,
    studentName: r.students?.name ?? null,
    whoName: r.account?.name ?? null,
    whoSub: r.account?.email ?? null,
    createdAt: r.created_at,
  }));

  const all = (totalsRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    linked: all.filter((r) => r.status === "linked").length,
    rejected: all.filter((r) => r.status === "rejected").length,
  };

  return (
    <LinksView
      title="학생 연결 승인"
      subtitle="학생 본인 계정 ↔ 학생 레코드 연결 요청 검토 (학생 포털 단계에서 유입)"
      table="student_account_links"
      whoLabel="학생 계정"
      rows={rows}
      q={q}
      status={status}
      resetHref="/admin/student-links"
      totals={totals}
    />
  );
}
