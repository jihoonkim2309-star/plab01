import { requireCenter } from "@/lib/center";
import AccountsView, { type AccountRow } from "../AccountsView";

export default async function StudentAccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const { supabase, centerId: cid } = await requireCenter();

  // 검색 적용 목록 + 필터 무관 카운트 + 학생 레코드 연결 현황
  let listQuery = supabase
    .from("users")
    .select("id, name, email, phone, created_at")
    .eq("center_id", cid)
    .eq("role", "student")
    .order("created_at", { ascending: false });
  if (q) {
    listQuery = listQuery.or(
      `name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`,
    );
  }

  const [listRes, allRes, linksRes] = await Promise.all([
    listQuery,
    supabase.from("users").select("id").eq("center_id", cid).eq("role", "student"),
    supabase
      .from("student_account_links")
      .select("user_id, students(name)")
      .eq("center_id", cid)
      .eq("status", "linked"),
  ]);

  const linkedStudentByUser = new Map<string, string>();
  for (const l of linksRes.data ?? []) {
    const rec = l as unknown as {
      user_id: string;
      students: { name: string } | null;
    };
    if (rec.students?.name) {
      linkedStudentByUser.set(rec.user_id, rec.students.name);
    } else {
      linkedStudentByUser.set(rec.user_id, "(이름없음)");
    }
  }

  const rows: AccountRow[] = (listRes.data ?? []).map((u) => {
    const linkedName = linkedStudentByUser.get(u.id);
    return {
      id: u.id,
      name: u.name,
      email: u.email,
      phone: (u as { phone: string | null }).phone,
      createdAt: u.created_at,
      extra: linkedName ?? "미연결",
    };
  });

  const totalAccounts = (allRes.data ?? []).length;
  const linkedAccounts = linkedStudentByUser.size;
  const unlinkedAccounts = totalAccounts - linkedAccounts;

  return (
    <AccountsView
      title="학생 계정 관리"
      subtitle="학생 본인 앱 계정 (가입·연결요청은 학생 포털 단계에서 유입)"
      rows={rows}
      q={q}
      showPhone
      extraLabel="연결 학생"
      resetHref="/admin/student-accounts"
      totals={{
        total: totalAccounts,
        extraCounts: [
          { label: "학생 연결", value: linkedAccounts },
          { label: "미연결", value: unlinkedAccounts },
        ],
      }}
    />
  );
}
