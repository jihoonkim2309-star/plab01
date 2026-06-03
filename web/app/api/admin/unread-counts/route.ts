import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { ACTIVE_CENTER_COOKIE } from "@/lib/center";
import { getUnreadCounts } from "@/lib/unread";

// 사이드바 미열람 뱃지용 — client (Sidebar) 가 mount 후 호출 + Realtime 이벤트 시 재호출.
// layout 의 server-side fetch 에서 이 무거운 쿼리들을 빼서 RSC 응답을 빠르게.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return NextResponse.json({}, { status: 401 });
  const userId = session.user.id;

  const { data: profile } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", userId)
    .single();
  const role = profile?.role ?? null;

  const jar = await cookies();
  const isSuper = role === "super_admin";
  const activeCenterId =
    (isSuper ? jar.get(ACTIVE_CENTER_COOKIE)?.value : profile?.center_id) ??
    profile?.center_id ??
    null;

  const counts = await getUnreadCounts(supabase, {
    userId,
    centerId: activeCenterId,
    role,
  });
  return NextResponse.json(counts, {
    headers: { "Cache-Control": "no-store" },
  });
}
