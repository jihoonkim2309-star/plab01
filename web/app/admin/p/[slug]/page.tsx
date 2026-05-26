import Link from "next/link";
import { PAGE_TITLES } from "../../nav";

export default async function PlaceholderPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const title = PAGE_TITLES[slug] ?? "준비 중";

  return (
    <>
      <div className="page-head">
        <div>
          <h1>{title}</h1>
          <p className="subtext">준비 중인 기능 — 다음 슬라이스에서 구현 예정</p>
        </div>
        <div className="toolbar">
          <Link className="btn" href="/admin">
            대시보드
          </Link>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <p className="panel-title">{title}</p>
          <span className="badge orange">준비 중</span>
        </div>
        <div className="panel-body">
          <div className="empty-state">
            <strong>이 화면은 아직 기능이 연결되지 않았습니다</strong>
            <p>
              디자인(외형)은 프로토타입 기준으로 적용되어 있습니다.
              <br />이 메뉴의 실제 기능은 다음 슬라이스에서 구현됩니다.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
