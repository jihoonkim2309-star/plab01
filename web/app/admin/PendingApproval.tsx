import "./admin.css";
import { signOut } from "./actions";

// 가입 후 슈퍼어드민(또는 해당 지점장) 승인 전 상태에서 보이는 화면.
// 사이드바·탑바 없이 정적 안내만 표시한다.
export default function PendingApproval({
  name,
  email,
  applyingCenterName,
}: {
  name: string;
  email: string;
  applyingCenterName: string | null;
}) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#f6faf8",
        padding: 24,
      }}
    >
      <div
        className="panel elevated"
        style={{
          maxWidth: 460,
          width: "100%",
          padding: 28,
          background: "#fff",
          borderRadius: 14,
          boxShadow: "0 20px 50px rgba(20, 40, 30, 0.08)",
          textAlign: "center",
        }}
      >
        <div
          aria-hidden
          style={{
            width: 64,
            height: 64,
            borderRadius: "50%",
            background: "var(--orange-soft, #fff5e6)",
            color: "var(--orange)",
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 28,
            margin: "0 auto 14px",
          }}
        >
          ⏳
        </div>
        <h1 style={{ fontSize: 20, fontWeight: 800, marginBottom: 8 }}>
          승인 대기 중
        </h1>
        <p className="muted" style={{ fontSize: 13, marginBottom: 18 }}>
          가입 신청이 접수되었습니다. 슈퍼 어드민 또는 해당 지점장이 승인하면
          어드민 콘솔에 접근할 수 있어요.
        </p>
        <div
          style={{
            background: "#f6f8f7",
            border: "1px solid var(--line)",
            borderRadius: 10,
            padding: 12,
            textAlign: "left",
            fontSize: 13,
            marginBottom: 18,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span className="muted">이름</span>
            <strong>{name || "-"}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span className="muted">이메일</span>
            <strong>{email}</strong>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
            <span className="muted">신청 지점</span>
            <strong>{applyingCenterName ?? "(지정 안 됨)"}</strong>
          </div>
        </div>
        <form action={signOut}>
          <button
            type="submit"
            className="btn"
            style={{ width: "100%", justifyContent: "center" }}
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  );
}
