import { ArrowLeft } from "lucide-react";
import { requirePortal } from "@/lib/portal-auth";
import PickerForm from "./PickerForm";

export default async function StudentConnectNew() {
  const guard = await requirePortal("student");
  let centerName: string | null = null;
  let centerId: string | null = null;
  if (!guard.isEmbed && guard.centerId) {
    centerId = guard.centerId;
    const { data } = await guard.supabase
      .from("centers")
      .select("name")
      .eq("id", guard.centerId)
      .maybeSingle();
    centerName = (data as { name?: string } | null)?.name ?? null;
  }
  return (
    <>
      <div className="portal-topbar">
        <a href="/student/connect" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>본인 연결 신청</h1>
        <span style={{ width: 38 }} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 12, lineHeight: 1.5 }}>
          본인 정보를 선택하면 지점에서 확인 후 연결해 드립니다. 학생 이름은 개인정보 보호를 위해 일부 마스킹됩니다.
        </p>
        {centerId && centerName ? (
          <PickerForm centerId={centerId} centerName={centerName} />
        ) : (
          <section className="card">
            <p style={{ fontSize: 13, color: "#b42318", textAlign: "center", padding: "20px 0" }}>
              지점 정보를 확인할 수 없습니다. 로그인 후 다시 시도해 주세요.
            </p>
          </section>
        )}
      </div>
    </>
  );
}
