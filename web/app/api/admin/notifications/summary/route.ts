import { NextResponse } from "next/server";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CENTER_COOKIE } from "@/lib/center";

// 알림 벨(액션 센터) 요약 — 처리 필요 항목 카운트. 현재 센터 컨텍스트 기준.
// 채팅 미열람은 플로팅 위젯이 담당하므로 여기선 제외(역할 분리).
export async function GET() {
  const supabase = await createClient();
  const h = await headers();

  let role = h.get("x-user-role");
  let centerId = h.get("x-center-id");

  if (!role) {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ items: [], total: 0 });
    const { data: p } = await supabase
      .from("users")
      .select("role, center_id")
      .eq("id", user.id)
      .single();
    role = p?.role ?? null;
    centerId = centerId ?? (p?.center_id as string | null) ?? null;
  }
  if (!centerId) {
    const jar = await cookies();
    centerId = jar.get(ACTIVE_CENTER_COOKIE)?.value ?? null;
  }
  // 센터 미선택(super 프랜차이즈 모드) — v1 은 빈 요약
  if (!centerId) return NextResponse.json({ items: [], total: 0 });

  const count = (p: PromiseLike<{ count: number | null }>) =>
    Promise.resolve(p).then((r) => r.count ?? 0);

  const [signups, parentLinks, studentLinks, failedPay] = await Promise.all([
    count(
      supabase
        .from("users")
        .select("id", { count: "exact", head: true })
        .is("role", null)
        .eq("applying_center_id", centerId),
    ),
    count(
      supabase
        .from("parent_student_links")
        .select("id", { count: "exact", head: true })
        .eq("center_id", centerId)
        .eq("status", "pending"),
    ),
    count(
      supabase
        .from("student_account_links")
        .select("id", { count: "exact", head: true })
        .eq("center_id", centerId)
        .eq("status", "pending"),
    ),
    count(
      supabase
        .from("invoices")
        .select("id", { count: "exact", head: true })
        .eq("center_id", centerId)
        .eq("status", "실패"),
    ),
  ]);

  const items = [
    { key: "signups", label: "가입 승인 대기", count: signups, href: "/admin/admin-approvals" },
    { key: "parentLinks", label: "자녀 연결 요청", count: parentLinks, href: "/admin/parent-links" },
    { key: "studentLinks", label: "학생 연결 요청", count: studentLinks, href: "/admin/student-links" },
    { key: "failedPay", label: "결제 실패", count: failedPay, href: "/admin/payment-status" },
  ].filter((i) => i.count > 0);

  const total = items.reduce((s, i) => s + i.count, 0);
  return NextResponse.json({ items, total });
}
