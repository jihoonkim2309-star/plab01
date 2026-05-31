// admin 영역 모든 페이지 전환 시 표시 (next.js loading.tsx 컨벤션).
// server component fetch · server action 후 revalidate · 메뉴 이동 시 자동 노출.
export default function AdminLoading() {
  return (
    <div className="page-loading">
      <div className="page-loading__spinner" aria-hidden />
      <p className="page-loading__text">처리 중...</p>
    </div>
  );
}
