// 어드민 라우트 간 이동 시 자동 표시되는 로딩 UI.
// 사이드바·헤더(layout) 는 그대로 유지되고 이 자리만 skeleton 으로 채워짐.
// 풀스크린 spinner 대신 페이지 윤곽을 즉시 보여줘 SPA 같은 체감 속도 제공.
export default function AdminLoading() {
  return (
    <div className="page-skeleton" aria-busy="true" aria-live="polite">
      <div className="page-head">
        <div>
          <div className="skel skel-bar" style={{ width: 180, height: 28 }} />
          <div className="skel skel-bar" style={{ width: 260, height: 14, marginTop: 8 }} />
        </div>
        <div className="toolbar">
          <div className="skel skel-bar" style={{ width: 96, height: 34 }} />
        </div>
      </div>

      <div className="member-summary">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="summary-card">
            <div className="skel skel-bar" style={{ width: 56, height: 11, marginBottom: 8 }} />
            <div className="skel skel-bar" style={{ width: 88, height: 24 }} />
          </div>
        ))}
      </div>

      <div className="panel elevated">
        <div className="panel-head">
          <div className="skel skel-bar" style={{ width: 140, height: 18 }} />
          <div className="skel skel-bar" style={{ width: 110, height: 30 }} />
        </div>
        <div className="panel-body" style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="skel skel-row" />
          ))}
        </div>
      </div>
    </div>
  );
}
