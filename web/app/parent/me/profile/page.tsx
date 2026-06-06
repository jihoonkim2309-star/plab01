import { ArrowLeft, Save } from "lucide-react";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import PortalTabbar from "../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";

async function fetchProfile() {
  const guard = await requirePortal("parent");
  if (guard.isEmbed) {
    return { name: "김지훈", phone: "010-1234-5678", email: "test@test.co.kr", centerName: "플랜비 본점" };
  }
  const { supabase, userId, centerId } = guard;
  const { data: u } = await supabase
    .from("users")
    .select("name, phone, email")
    .eq("id", userId)
    .single();
  let centerName: string | null = null;
  if (centerId) {
    const { data: c } = await supabase
      .from("centers")
      .select("name")
      .eq("id", centerId)
      .maybeSingle();
    centerName = (c as { name?: string } | null)?.name ?? null;
  }
  const user = (u as { name: string | null; phone: string | null; email: string | null } | null) ?? null;
  return {
    name: user?.name ?? "",
    phone: user?.phone ?? "",
    email: user?.email ?? "",
    centerName,
  };
}

async function updateProfile(formData: FormData) {
  "use server";
  const guard = await requirePortal("parent");
  if (guard.isEmbed) redirect("/parent/me");
  const { supabase, userId } = guard;
  const name = String(formData.get("name") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  if (!name) redirect("/parent/me/profile?error=name");

  await supabase
    .from("users")
    .update({ name, phone: phone || null })
    .eq("id", userId);
  revalidatePath("/parent/me");
  revalidatePath("/parent");
  redirect("/parent/me?msg=saved");
}

export default async function ParentProfileEdit() {
  const p = await fetchProfile();
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #e5e7eb",
    fontSize: 14,
    fontFamily: "inherit",
    boxSizing: "border-box",
  };
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/me" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>프로필 수정</h1>
        <span style={{ width: 38 }} />
      </div>
      <div className="portal-content">
        <form action={updateProfile} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6f7d78", fontWeight: 600 }}>이름 *</span>
            <input name="name" type="text" required defaultValue={p.name} maxLength={40} style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6f7d78", fontWeight: 600 }}>연락처</span>
            <input name="phone" type="tel" inputMode="numeric" defaultValue={p.phone} placeholder="010-0000-0000" style={inputStyle} />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6f7d78", fontWeight: 600 }}>이메일</span>
            <input type="email" disabled value={p.email} style={{ ...inputStyle, background: "#f9fafb", color: "#9ca3af" }} />
            <span style={{ fontSize: 11, color: "#9ca3af" }}>이메일은 변경할 수 없습니다.</span>
          </label>
          {p.centerName && (
            <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <span style={{ fontSize: 12, color: "#6f7d78", fontWeight: 600 }}>소속 지점</span>
              <input type="text" disabled value={p.centerName} style={{ ...inputStyle, background: "#f9fafb", color: "#9ca3af" }} />
              <span style={{ fontSize: 11, color: "#9ca3af" }}>지점은 지점 문의로만 변경할 수 있습니다.</span>
            </label>
          )}
          <button
            type="submit"
            className="btn primary"
            style={{
              width: "100%",
              padding: "12px 0",
              fontSize: 14,
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              marginTop: 8,
            }}
          >
            <Save size={16} />
            저장
          </button>
        </form>
      </div>
      <PortalTabbar />
    </>
  );
}
