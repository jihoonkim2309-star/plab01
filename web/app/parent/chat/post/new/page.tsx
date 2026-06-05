import { ArrowLeft, Bell } from "lucide-react";
import PortalTabbar from "../../../PortalTabbar";
import { requirePortal } from "@/lib/portal-auth";
import { createParentPost } from "../../actions";

export default async function ParentChatPostNew() {
  await requirePortal("parent");
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/chat/post" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>새 문의 작성</h1>
        <Bell size={20} />
      </div>
      <div className="portal-content">
        <form action={createParentPost} className="card" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6f7d78", fontWeight: 600 }}>제목 *</span>
            <input
              name="subject"
              type="text"
              required
              maxLength={120}
              placeholder="예: 셔틀 노선 변경 가능한가요?"
              style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14 }}
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <span style={{ fontSize: 12, color: "#6f7d78", fontWeight: 600 }}>내용</span>
            <textarea
              name="body"
              rows={8}
              placeholder="자세한 내용을 적어 주세요"
              style={{ padding: "10px 12px", border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 14, fontFamily: "inherit", resize: "vertical" }}
            />
          </label>
          <button
            type="submit"
            className="btn primary"
            style={{ width: "100%", padding: "12px 0", fontSize: 14, fontWeight: 700 }}
          >
            등록
          </button>
        </form>
        <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 10, lineHeight: 1.5, textAlign: "center" }}>
          지점이 확인 후 답변 드립니다. 답변은 같은 페이지에서 확인할 수 있습니다.
        </p>
      </div>
      <PortalTabbar />
    </>
  );
}
