import { requireCenter } from "@/lib/center";
import AccountsView, { type AccountRow } from "../AccountsView";

export default async function ParentAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 검색 적용 목록 + 필터 무관 전체 카운트 + 자녀 연결 현황
  let listQuery = supabase
    .from("users")
    .select("id, name, email, phone, created_at")
    .eq("center_id", cid)
    .eq("role", "parent")
    .order("created_at", { ascending: false });
  if (q) {
    listQuery = listQuery.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const [listRes, allRes, linksRes] = await Promise.all([
    listQuery,
    supabase.from("users").select("id").eq("center_id", cid).eq("role", "parent"),
    supabase
      .from("parent_student_links")
      .select("parent_id, status")
      .eq("center_id", cid)
      .eq("status", "linked"),
  ]);

  const linkedCountByParent = new Map<string, number>();
  for (const l of linksRes.data ?? []) {
    const pid = (l as { parent_id: string }).parent_id;
    linkedCountByParent.set(pid, (linkedCountByParent.get(pid) ?? 0) + 1);
  }

  const rows: AccountRow[] = (listRes.data ?? []).map((u) => {
    const n = linkedCountByParent.get(u.id) ?? 0;
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: (u as { phone: string | null }).phone,
      createdAt: u.created_at,
      extra: n > 0 ? `${n}명` : "미연결",
    };
  });

  const totalParents = (allRes.data ?? []).length;
  const linkedParents = new Set(linkedCountByParent.keys()).size;
  const unlinkedParents = totalParents - linkedParents;

  return (
    <AccountsView
      title="학부모 계정 관리"
      subtitle="학부모 포털 가입 계정 (가입·연결요청은 학부모 포털 단계에서 유입)"
      rows={rows}
      q={q}
      showPhone
      extraLabel="연결 자녀"
      resetHref="/admin/parent-accounts"
      totals={{
        total: totalParents,
        extraCounts: [
          { label: "자녀 연결", value: linkedParents },
          { label: "미연결", value: unlinkedParents },
        ],
      }}
    />
  );
}
