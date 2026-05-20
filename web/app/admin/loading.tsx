// 어드민 라우트 간 이동 시 자동 표시되는 로딩 UI (Next.js Loading UI).
export default function AdminLoading() {
  return (
    <div className="loading-overlay" role="status" aria-live="polite">
      <div className="loading-spinner" aria-hidden="true" />
      <div>불러오는 중...</div>
    </div>
  );
}
