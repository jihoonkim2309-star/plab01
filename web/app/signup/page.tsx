import Link from "next/link";
import { Briefcase, Users } from "lucide-react";

export default function SignupPick() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #f6faf8, #fff)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
      fontFamily: "Pretendard Variable, Pretendard, -apple-system, 'Noto Sans KR', 'Segoe UI', Roboto, Arial, sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: 480 }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/planb-logo.svg" alt="PlanB" style={{ height: 28, marginBottom: 16 }} />
          <h1 style={{ fontSize: 22, fontWeight: 800, marginBottom: 6 }}>가입 유형 선택</h1>
          <p style={{ fontSize: 13, color: "#6f7d78" }}>어느 역할로 가입하시나요?</p>
        </div>

        <Link
          href="/signup/member"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            textDecoration: "none",
            color: "#111",
            marginBottom: 12,
            boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "var(--brand-soft, #d8ecdf)", color: "var(--brand, #1e794e)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Users size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 16, display: "block" }}>회원</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 4, lineHeight: 1.5 }}>
              학부모 · 학생 — 자녀(본인) 정보 조회, 결제, 셔틀, 리포트, 1:1 문의
            </p>
          </div>
        </Link>

        <Link
          href="/signup/staff"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            padding: 20,
            background: "#fff",
            borderRadius: 16,
            border: "1px solid #e5e7eb",
            textDecoration: "none",
            color: "#111",
            boxShadow: "0 1px 3px rgba(0,0,0,.04)",
          }}
        >
          <div style={{ width: 52, height: 52, borderRadius: 14, background: "#fde68a", color: "#92400e", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Briefcase size={26} />
          </div>
          <div style={{ flex: 1 }}>
            <strong style={{ fontSize: 16, display: "block" }}>관리자</strong>
            <p style={{ fontSize: 12, color: "#6f7d78", marginTop: 4, lineHeight: 1.5 }}>
              지점 관리자 · 코치 · 기사 — 학원 운영 / 수업 운영 / 차량 운행
            </p>
            <p style={{ fontSize: 11, color: "#b45309", marginTop: 6 }}>
              ※ 슈퍼어드민 승인 후 활성
            </p>
          </div>
        </Link>

        <div style={{ textAlign: "center", marginTop: 24, fontSize: 13 }}>
          이미 계정이 있나요?{" "}
          <Link href="/login" style={{ color: "var(--brand, #1e794e)", fontWeight: 700, textDecoration: "none" }}>
            로그인
          </Link>
        </div>
      </div>
    </div>
  );
}
