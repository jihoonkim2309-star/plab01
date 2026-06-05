import { SkeletonBox, SkeletonCard } from "./Skeleton";

export default function Loading() {
  return (
    <div className="sk-wrapper">
      <div className="page-head">
        <div>
          <SkeletonBox height={22} width={180} />
          <div style={{ marginTop: 6 }}>
            <SkeletonBox height={14} width={280} />
          </div>
        </div>
      </div>
      <SkeletonCard height={520} />
    </div>
  );
}
