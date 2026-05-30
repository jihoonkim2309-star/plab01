// Suspense fallback — 차트 로딩 동안 자리만 잡기.
export default function ChartSkeleton({ height = 240 }: { height?: number }) {
  return (
    <div
      className="skel"
      style={{
        height,
        margin: "16px 0",
        borderRadius: 8,
        opacity: 0.6,
      }}
      aria-hidden
    />
  );
}
