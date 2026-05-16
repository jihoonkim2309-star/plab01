"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCenter } from "@/lib/center";

// 연결 승인 테이블 화이트리스트 (SQL 인젝션 방지)
const TABLES: Record<string, string> = {
  parent_student_links: "/admin/parent-links",
  student_account_links: "/admin/student-links",
};

// status: linked | rejected | pending
export async function bulkSetLinkStatus(formData: FormData) {
  const { supabase } = await requireCenter();
  const table = String(formData.get("table") ?? "");
  const status = String(formData.get("status") ?? "");
  const ids = formData.getAll("ids").map(String).filter(Boolean);

  if (!TABLES[table]) throw new Error("잘못된 대상입니다.");
  if (!["linked", "rejected", "pending"].includes(status))
    throw new Error("잘못된 상태입니다.");
  if (ids.length === 0) throw new Error("선택된 항목이 없습니다.");

  const { error } = await supabase
    .from(table)
    .update({ status })
    .in("id", ids);
  if (error) throw new Error("처리 실패: " + error.message);

  revalidatePath(TABLES[table]);
  redirect(TABLES[table]);
}
