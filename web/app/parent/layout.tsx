import type { ReactNode } from "react";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import PortalShell from "../portal/PortalShell";

// embed=1 (preview iframe) 이면 인증 skip — mock UI 그대로.
// 실 진입 시 인증 + role='parent' 가드.
async function isEmbedRequest(): Promise<boolean> {
  const h = await headers();
  const ref = h.get("referer") ?? "";
  const search = h.get("x-search-params") ?? "";
  return search.includes("embed=1") || ref.includes("/preview");
}

export default async function ParentLayout({ children }: { children: ReactNode }) {
  const embed = await isEmbedRequest();
  if (!embed) {
    const supabase = await createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) redirect("/login");
    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();
    if (profile?.role !== "parent") redirect("/login?msg=no-access");
    // cookie 로 가드 통과 표시 (인증 1회 후 children 으로)
    const jar = await cookies();
    if (!jar.get("parent_ok")) {
      jar.set("parent_ok", "1", { path: "/parent", httpOnly: true, sameSite: "lax" });
    }
  }
  return (
    <Suspense fallback={null}>
      <PortalShell device="phone">{children}</PortalShell>
    </Suspense>
  );
}
