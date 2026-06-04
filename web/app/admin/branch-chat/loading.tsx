import { SkeletonBox, SkeletonCard } from "../Skeleton";

export default function Loading() {
  return (
    <>
      <div className="page-head">
        <div>
          <SkeletonBox height={22} width={120} />
          <div style={{ marginTop: 6 }}>
            <SkeletonBox height={14} width={220} />
          </div>
        </div>
      </div>
      <SkeletonCard height={520} />
    </>
  );
}
