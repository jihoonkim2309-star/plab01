import { Bell, Building2, ChevronRight, LogOut, Settings, User } from "lucide-react";
import { redirect } from "next/navigation";
import PortalTabbar from "../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";
import { createClient } from "@/lib/supabase/server";

type Profile = {
  name: string;
  email: string;
  phone: string | null;
  centerName: string | null;
};

const MOCK: Profile = {
  name: "김지훈",
  email: "jihoonkim2309@gmail.com",
  phone: "010-1234-5678",
  centerName: "플랜비 본점",
};

async function fetchProfile(): Promise<Profile> {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) return MOCK;
  const { supabase, userId, centerId } = guard;
  const { data: u } = await supabase
    .from("users")
    .select("name, email, phone")
    .eq("id", userId)
    .single();
  type U = { name: string | null; email: string | null; phone: string | null };
  const user = (u as U | null) ?? { name: null, email: null, phone: null };
  let centerName: string | null = null;
  if (centerId) {
    const { data: c } = await supabase
      .from("centers")
      .select("name")
      .eq("id", centerId)
      .maybeSingle();
    centerName = (c as { name?: string } | null)?.name ?? null;
  }
  return {
    name: user.name ?? "이름 없음",
    email: user.email ?? "",
    phone: user.phone,
    centerName,
  };
}

async function logoutAction() {
  "use server";
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/user/login");
}

export default async function ParentMe() {
  const profile = await fetchProfile();
  const initial = profile.name.slice(0, 1);
  return (
    <>
      <div className="portal-topbar">
        <h1>나</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <section className="card">
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div className="avatar" style={{ width: 56, height: 56, fontSize: 20 }}>{initial}</div>
            <div style={{ flex: 1 }}>
              <strong style={{ fontSize: 15 }}>{profile.name}</strong>
              <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>{profile.email}</div>
              {profile.phone && (
                <div style={{ fontSize: 12, color: "#6f7d78", marginTop: 2 }}>{profile.phone}</div>
              )}
            </div>
          </div>
          {profile.centerName && (
            <div
              style={{
                marginTop: 12,
                padding: "8px 12px",
                borderRadius: 8,
                background: "#f4f6f5",
                fontSize: 12,
                color: "#374151",
              }}
            >
              <Building2 size={12} style={{ display: "inline", marginRight: 6, verticalAlign: "middle", color: "#6f7d78" }} />
              {profile.centerName}
            </div>
          )}
        </section>

        <section className="card" style={{ padding: 0 }}>
          {[
            { icon: User, label: "프로필 수정", href: "/parent/me/profile" },
            { icon: Settings, label: "알림 설정", href: "/parent/me/notifications" },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <a
                key={item.label}
                href={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  textDecoration: "none",
                  color: "#111",
                  borderTop: "1px solid #f1f5f4",
                }}
              >
                <Icon size={18} color="#6f7d78" />
                <span style={{ flex: 1, fontSize: 14 }}>{item.label}</span>
                <ChevronRight size={16} color="#9ca3af" />
              </a>
            );
          })}
        </section>

        <section className="card">
          <form action={logoutAction}>
            <button
              type="submit"
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                padding: "10px 0",
                background: "transparent",
                border: 0,
                color: "#b42318",
                fontWeight: 700,
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              <LogOut size={16} />
              로그아웃
            </button>
          </form>
        </section>
      </div>
      <PortalTabbar />
    </>
  );
}
