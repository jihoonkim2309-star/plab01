import { SkeletonBox, SkeletonCard } from "./Skeleton";

// generic admin skeleton — 자체 loading.tsx 없는 모든 페이지에 fallback.
// 페이지 구조 가정 안 함 (단순 head + 큰 콘텐츠 placeholder).
export default function Loading() {
  return (
    <>
      <div className="page-head">
        <div>
          <SkeletonBox height={22} width={180} />
          <div style={{ marginTop: 6 }}>
            <SkeletonBox height={14} width={280} />
          </div>
        </div>
      </div>
      <SkeletonCard height={520} />
    </>
  );
}
