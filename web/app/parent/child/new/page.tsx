import { ArrowLeft } from "lucide-react";

export default function ParentChildLink() {
  return (
    <>
      <div className="portal-topbar">
        <a href="/parent/child" style={{ color: "#fff", display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", fontSize: 14 }}>
          <ArrowLeft size={18} /> 뒤로
        </a>
        <h1 style={{ flex: 1, textAlign: "center" }}>자녀 연결 신청</h1>
        <span style={{ width: 38 }} />
      </div>
      <div className="portal-content">
        <p style={{ fontSize: 12, color: "#6f7d78", marginBottom: 12, lineHeight: 1.5 }}>
          학생 정보를 입력하면 지점 어드민이 확인 후 승인합니다.
          승인까지는 일반적으로 1영업일 이내 처리됩니다.
        </p>
        <form className="card" style={{ display: "block" }}>
          <div className="portal-field">
            <label>지점</label>
            <select name="center_id" required>
              <option value="">지점 선택</option>
              <option value="planb-main">플랜비 본점</option>
              <option value="planb-gn">플랜비 강남점</option>
              <option value="planb-gg">플랜비 광교점</option>
            </select>
          </div>
          <div className="portal-field">
            <label>학생 이름 *</label>
            <input name="name" required placeholder="예: 박도윤" />
          </div>
          <div className="portal-field">
            <label>학교 *</label>
            <input name="school" required placeholder="예: 한빛초등학교" />
          </div>
          <div className="portal-field">
            <label>학년 *</label>
            <select name="grade" required>
              <option value="">학년 선택</option>
              <option>초1</option><option>초2</option><option>초3</option>
              <option>초4</option><option>초5</option><option>초6</option>
              <option>중1</option><option>중2</option><option>중3</option>
            </select>
          </div>
          <div className="portal-field">
            <label>생년월일</label>
            <input name="birth" placeholder="YYYY-MM-DD" />
          </div>
          <div className="portal-field">
            <label>본인 관계</label>
            <select name="relation">
              <option>부</option>
              <option>모</option>
              <option>조부모</option>
              <option>기타 보호자</option>
            </select>
          </div>
          <button type="submit" className="btn primary" style={{ width: "100%", marginTop: 6 }}>
            연결 신청
          </button>
        </form>
      </div>
    </>
  );
}
