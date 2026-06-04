import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type PortalRole = "parent" | "student" | "coach" | "driver";

// /preview iframe 안에서 호출인지 판별.
// 가장 신뢰: middleware 가 set 한 x-portal-embed 헤더.
async function isPreviewEmbed(): Promise<boolean> {
  const h = await headers();

  // 1) middleware 가 set 한 단일 헤더
  if (h.get("x-portal-embed") === "1") return true;

  // 2) x-search-params 의 embed=1
  const search = h.get("x-search-params") ?? "";
  if (search.includes("embed=1")) return true;

  // 3) raw cookie header
  const cookieHeader = h.get("cookie") ?? "";
  if (/(?:^|;\s*)portal_embed=1(?:;|$)/.test(cookieHeader)) return true;

  // 4) cookies() helper
  const jar = await cookies();
  if (jar.get("portal_embed")?.value === "1") return true;

  // 5) referer fallback
  const ref = h.get("referer") ?? "";
  try {
    const u = new URL(ref);
    return u.pathname === "/preview" || u.pathname.startsWith("/preview/");
  } catch {
    return false;
  }
}

// 포털 페이지 인증 가드. embed (preview iframe) 면 가드 skip — mock 그대로.
// 미인증 시 role 따라 redirect:
//   parent/student → /user/login
//   coach/driver → /staff/login
// role 불일치 → /user/login or /staff/login (해당 그룹 안내)
export async function requirePortal(role: PortalRole) {
  const embed = await isPreviewEmbed();
  if (embed) return { isEmbed: true as const };

  const loginPath =
    role === "parent" || role === "student" ? "/user/login" : "/staff/login";

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect(loginPath);

  const { data: profile } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", session.user.id)
    .single();
  const userRole = (profile as { role?: string } | null)?.role ?? null;
  if (userRole !== role) {
    redirect(`${loginPath}?msg=no-access`);
  }
  return {
    isEmbed: false as const,
    supabase,
    userId: session.user.id,
    role: userRole as PortalRole,
    centerId: (profile as { center_id?: string } | null)?.center_id ?? null,
  };
}
