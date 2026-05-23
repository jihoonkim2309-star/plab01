import Link from "next/link";
import { setActiveCenter } from "./actions-center";

type Center = {
  id: string;
  name: string;
  address: string | null;
  contact_phone: string | null;
};

type Counts = Record<
  string,
  {
    students: number;
    newStudents: number;
    admins: number;
    coaches: number;
    revenue: number;
  }
>;

const fmtKRW = (n: number) => {
  if (n >= 10000000) return `${Math.round(n / 1000000)}M`;
  if (n >= 10000) return `${Math.round(n / 10000)}만`;
  return n.toLocaleString();
};

export default function SelectCenterDashboard({
  centers,
  counts,
  userName,
}: {
  centers: Center[];
  counts: Counts;
  userName: string;
}) {
  return (
    <>
      <div className="page-head">
        <div>
          <h1>지점을 선택해 주세요</h1>
          <p className="subtext">
            {userName}님, 슈퍼 어드민으로 접속하셨습니다. 작업할 지점을
            선택하시면 그 지점 컨텍스트로 모든 화면이 동작합니다.
          </p>
        </div>
      </div>

      <div className="panel elevated select-center-hero">
        <div className="select-center-hero-content">
          <div className="sch-icon" aria-hidden>
            ◇
          </div>
          <div>
            <h2 className="sch-title">활성 지점 미설정</h2>
            <p className="sch-sub">
              아래 지점 중 하나를 선택하시면 좌측 사이드바·대시보드 모두 그
              지점 기준으로 표시됩니다. 언제든 탑바 좌측 워크스페이스
              셀렉터에서 다시 전환 가능합니다.
            </p>
          </div>
        </div>
      </div>

      {centers.length === 0 ? (
        <div className="panel">
          <div className="empty-state">
            <strong>등록된 지점이 없습니다</strong>
            <p>
              먼저 <Link href="/admin/centers">지점 관리</Link>에서 지점을
              개설해 주세요.
            </p>
          </div>
        </div>
      ) : (
        <div className="select-center-grid">
          {centers.map((c) => {
            const ct = counts[c.id] ?? {
              students: 0,
              newStudents: 0,
              admins: 0,
              coaches: 0,
              revenue: 0,
            };
            return (
              <form action={setActiveCenter} key={c.id} className="select-center-card-form">
                <input type="hidden" name="center_id" value={c.id} />
                <button type="submit" className="select-center-card">
                  <div className="scc-head">
                    <div className="scc-icon" aria-hidden>◇</div>
                    <div className="scc-meta">
                      <strong className="scc-name">{c.name}</strong>
                      {c.address && (
                        <span className="scc-addr">{c.address}</span>
                      )}
                    </div>
                  </div>
                  <div className="scc-stats">
                    <div>
                      <span>총 회원</span>
                      <strong>{ct.students}</strong>
                    </div>
                    <div>
                      <span>이달 신규</span>
                      <strong>{ct.newStudents}</strong>
                    </div>
                    <div>
                      <span>당월 매출</span>
                      <strong>{fmtKRW(ct.revenue)}</strong>
                    </div>
                    <div>
                      <span>지점장</span>
                      <strong>{ct.admins}</strong>
                    </div>
                    <div>
                      <span>코치</span>
                      <strong>{ct.coaches}</strong>
                    </div>
                  </div>
                  <div className="scc-cta">
                    이 지점으로 이동 <span aria-hidden>→</span>
                  </div>
                </button>
              </form>
            );
          })}
        </div>
      )}

      <p className="muted" style={{ marginTop: 14, fontSize: 12 }}>
        새 지점을 개설하려면 <Link href="/admin/centers">지점 관리</Link>에서
        진행하세요.
      </p>
    </>
  );
}
