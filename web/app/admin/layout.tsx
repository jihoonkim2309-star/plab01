import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "./actions";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("name, role, center_id")
    .eq("id", user.id)
    .single();

  const needsBootstrap = !profile?.role || !profile?.center_id;

  return (
    <div className="min-h-screen bg-zinc-100">
      <header className="bg-zinc-900 text-white">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <span className="font-bold">플랜비 본점 · 어드민</span>
            <nav className="flex gap-4 text-sm text-zinc-300">
              <Link href="/admin/students" className="hover:text-white">
                학생 관리
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-400">{profile?.name ?? user.email}</span>
            <form action={signOut}>
              <button className="text-zinc-300 hover:text-white">로그아웃</button>
            </form>
          </div>
        </div>
      </header>

      {needsBootstrap && (
        <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-sm">
          <div className="max-w-5xl mx-auto px-4 py-3">
            아직 이 계정에 <b>센터/권한</b>이 지정되지 않았습니다. Supabase SQL
            Editor 에서 <code>schema.sql</code> 하단의 부트스트랩 SQL을 실행해
            센터를 만들고 이 계정을 <code>admin</code> 으로 승격하세요. (현재
            이메일: <b>{user.email}</b>)
          </div>
        </div>
      )}

      <main className="max-w-5xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
