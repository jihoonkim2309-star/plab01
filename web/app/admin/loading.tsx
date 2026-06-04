import { SkeletonBox, SkeletonCard } from "./Skeleton";

export default function Loading() {
  return (
    <>
      <div className="page-head">
        <div>
          <SkeletonBox height={22} width={120} />
          <div style={{ marginTop: 6 }}>
            <SkeletonBox height={14} width={300} />
          </div>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 14 }}>
        <SkeletonCard height={180} />
        <SkeletonCard height={180} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginTop: 14 }}>
        <SkeletonCard height={100} />
        <SkeletonCard height={100} />
        <SkeletonCard height={100} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginTop: 14 }}>
        <SkeletonCard height={240} />
        <SkeletonCard height={240} />
        <SkeletonCard height={240} />
      </div>
    </>
  );
}
