import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type PortalRole = "parent" | "student" | "coach" | "driver";

// /preview iframe 안에서 호출인지 판별 — referer 의 path 가 /preview 면 embed.
async function isPreviewEmbed(): Promise<boolean> {
  const h = await headers();
  const ref = h.get("referer") ?? "";
  try {
    const u = new URL(ref);
    return u.pathname === "/preview" || u.pathname.startsWith("/preview/");
  } catch {
    return false;
  }
}

// 포털 페이지 인증 가드. embed (preview iframe) 면 가드 skip — mock 그대로.
// 미인증 → /login (또는 /signup 안내). role 불일치 → /login?msg=no-access.
export async function requirePortal(role: PortalRole) {
  const embed = await isPreviewEmbed();
  if (embed) return { isEmbed: true as const };

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect(`/login?next=${role}`);

  const { data: profile } = await supabase
    .from("users")
    .select("role, center_id")
    .eq("id", session.user.id)
    .single();
  const userRole = (profile as { role?: string } | null)?.role ?? null;
  if (userRole !== role) {
    redirect("/login?msg=no-access");
  }
  return {
    isEmbed: false as const,
    supabase,
    userId: session.user.id,
    role: userRole as PortalRole,
    centerId: (profile as { center_id?: string } | null)?.center_id ?? null,
  };
}
