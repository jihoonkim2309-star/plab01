import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export type PortalRole = "parent" | "student" | "coach" | "driver";

// 포털 페이지 인증 가드. embed 모드 (preview iframe 안) 면 mock 반환.
// 실제 진입 시 role 매칭 안 되면 /login redirect.
export async function requirePortal(role: PortalRole) {
  // /preview iframe 의 ?embed=1 검출 — referer 헤더로 detection
  const h = await headers();
  const referer = h.get("referer") ?? "";
  const url = h.get("x-pathname") ?? "";
  const search = h.get("x-search") ?? "";
  const isEmbed =
    search.includes("embed=1") ||
    url.includes("embed=1") ||
    referer.includes("/preview");

  if (isEmbed) {
    return {
      supabase: null,
      userId: null,
      role,
      isEmbed: true as const,
    };
  }

  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("role, name")
    .eq("id", session.user.id)
    .single();

  if (profile?.role !== role) {
    redirect("/login?msg=no-access");
  }

  return {
    supabase,
    userId: session.user.id,
    role: profile.role as PortalRole,
    name: (profile as { name?: string }).name ?? null,
    isEmbed: false as const,
  };
}
