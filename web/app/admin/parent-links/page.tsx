import { requireCenter } from "@/lib/center";
import LinksView, { type LinkRow } from "../LinksView";
import MatchModal from "./MatchModal";

export default async function ParentLinksPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status, q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 검색·필터 적용 목록 + 필터 무관 카운트
  let listQuery = supabase
    .from("parent_student_links")
    .select(
      "id, status, created_at, student_id, requested_name, requested_school, requested_grade, relation, students(name), parent:users!parent_id(name, email)",
    )
    .eq("center_id", cid)
    .order("created_at", { ascending: false });
  if (status) listQuery = listQuery.eq("status", status);

  const [listRes, totalsRes] = await Promise.all([
    listQuery,
    supabase.from("parent_student_links").select("status").eq("center_id", cid),
  ]);

  type RawRow = {
    id: string;
    status: string;
    created_at: string | null;
    student_id: string | null;
    requested_name: string | null;
    requested_school: string | null;
    requested_grade: string | null;
    relation: string | null;
    students: { name: string } | null;
    parent: { name: string | null; email: string | null } | null;
  };

  let raw = (listRes.data ?? []) as unknown as RawRow[];
  if (q) {
    const needle = q.toLowerCase();
    raw = raw.filter((r) => {
      const s = (r.students?.name ?? r.requested_name ?? "").toLowerCase();
      const pn = (r.parent?.name ?? "").toLowerCase();
      const pe = (r.parent?.email ?? "").toLowerCase();
      return s.includes(needle) || pn.includes(needle) || pe.includes(needle);
    });
  }

  const rows: LinkRow[] = raw.map((r) => {
    const reqMeta = !r.student_id && (r.requested_school || r.requested_grade)
      ? `${r.requested_school ?? ""}${r.requested_school && r.requested_grade ? " · " : ""}${r.requested_grade ?? ""}`
      : null;
    return {
      id: r.id,
      status: r.status,
      studentId: r.student_id,
      studentName: r.students?.name ?? r.requested_name ?? null,
      studentNote: !r.student_id
        ? `매칭 필요${reqMeta ? ` · ${reqMeta}` : ""}${r.relation ? ` · (${r.relation})` : ""}`
        : null,
      studentAction: !r.student_id ? (
        <MatchModal
          linkId={r.id}
          initialName={r.requested_name}
          initialSchool={r.requested_school}
          initialGrade={r.requested_grade}
        />
      ) : null,
      whoName: r.parent?.name ?? null,
      whoSub: r.parent?.email ?? null,
      createdAt: r.created_at,
    };
  });

  const all = (totalsRes.data ?? []) as { status: string }[];
  const totals = {
    total: all.length,
    pending: all.filter((r) => r.status === "pending").length,
    linked: all.filter((r) => r.status === "linked").length,
    rejected: all.filter((r) => r.status === "rejected").length,
  };

  return (
    <LinksView
      title="자녀 연결 승인"
      subtitle="학부모 ↔ 학생 연결 요청 검토 (학부모 포털 단계에서 요청 유입)"
      table="parent_student_links"
      whoLabel="학부모"
      rows={rows}
      q={q}
      status={status}
      resetHref="/admin/parent-links"
      totals={totals}
    />
  );
}
