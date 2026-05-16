import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const { count: studentCount } = await supabase
    .from("students")
    .select("*", { count: "exact", head: true });

  const total = studentCount ?? 0;

  return (
    <>
      <div className="page-head">
        <div>
          <h1>Dashboard</h1>
          <p className="subtext">플랜비 본점 · 2026년 5월 운영 현황</p>
        </div>
        <div className="toolbar">
          <Link className="btn primary" href="/admin/students/new">
            학생 등록
          </Link>
        </div>
      </div>

      <div className="metric-strip">
        <div
          className="metric-cell"
          style={{
            background: "linear-gradient(135deg,#07120e,#0b7b45)",
            color: "#fff",
          }}
        >
          <span style={{ color: "rgba(255,255,255,.75)" }}>등록 학생</span>
          <strong>{total}</strong>
          <small style={{ color: "rgba(255,255,255,.72)" }}>
            실제 DB 연동됨
          </small>
        </div>
        <div className="metric-cell">
          <span>출석률</span>
          <strong>—</strong>
          <small>다음 슬라이스</small>
        </div>
        <div className="metric-cell">
          <span>이번 달 청구</span>
          <strong>—</strong>
          <small>결제 슬라이스 예정</small>
        </div>
        <div className="metric-cell">
          <span>리포트 발행</span>
          <strong>—</strong>
          <small>리포트 슬라이스 예정</small>
        </div>
      </div>

      <div className="grid kpis">
        <div className="panel kpi accent">
          <div className="kpi-label">등록 학생</div>
          <div className="kpi-value">{total}</div>
          <div className="kpi-note">Supabase 실데이터</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-label">오늘 수업</div>
          <div className="kpi-value">—</div>
          <div className="kpi-note">수업 운영 슬라이스</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-label">미납 건수</div>
          <div className="kpi-value">—</div>
          <div className="kpi-note">결제 슬라이스</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-label">셔틀 운행</div>
          <div className="kpi-value">—</div>
          <div className="kpi-note">셔틀 슬라이스</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-label">연결 승인 대기</div>
          <div className="kpi-value">—</div>
          <div className="kpi-note">회원 슬라이스</div>
        </div>
        <div className="panel kpi">
          <div className="kpi-label">문의</div>
          <div className="kpi-value">—</div>
          <div className="kpi-note">상담 슬라이스</div>
        </div>
      </div>

      <div className="grid two-col">
        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">현재 가동 중 (Slice 1)</p>
            <Link className="btn" href="/admin/students">
              학생 관리 열기
            </Link>
          </div>
          <div className="panel-body">
            <div className="task-list">
              <div className="task">
                <span className="task-mark" />
                <div>
                  <strong>학생 등록 / 목록 / 상세 / 수정 / 삭제</strong>
                  <div className="muted">Supabase DB 실제 저장 · RLS 적용</div>
                </div>
                <span className="badge green">가동</span>
              </div>
              <div className="task">
                <span className="task-mark blue" />
                <div>
                  <strong>관리자 인증</strong>
                  <div className="muted">Supabase Auth 로그인/세션</div>
                </div>
                <span className="badge green">가동</span>
              </div>
              <div className="task">
                <span className="task-mark orange" />
                <div>
                  <strong>결제 · 셔틀 · 리포트 · 포털</strong>
                  <div className="muted">프로토타입 화면 → 슬라이스별 구현 예정</div>
                </div>
                <span className="badge orange">예정</span>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <p className="panel-title">안내</p>
          </div>
          <div className="panel-body">
            <div className="empty-state">
              <strong>외형 우선 적용됨</strong>
              <p>
                프로토타입 디자인을 실제 앱에 입혔습니다. 좌측 메뉴의 회색
                항목은 아직 화면만 준비된 단계이며, 슬라이스별로 실제 기능을
                연결합니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
