// 페이지 loading.tsx 에서 사용할 공통 skeleton 컴포넌트.
// pulse 애니메이션 (CSS) 으로 회색 박스 표시.

export function SkeletonBox({
  height = 16,
  width = "100%",
  radius = 6,
  style,
}: {
  height?: number | string;
  width?: number | string;
  radius?: number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="sk-pulse"
      style={{
        height,
        width,
        borderRadius: radius,
        background: "#e5e7eb",
        ...style,
      }}
    />
  );
}

export function SkeletonRow({ cols = 4 }: { cols?: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} style={{ padding: "12px 8px" }}>
          <SkeletonBox height={14} />
        </td>
      ))}
    </tr>
  );
}

export function SkeletonTable({ rows = 8, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <table>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <SkeletonRow key={i} cols={cols} />
        ))}
      </tbody>
    </table>
  );
}

export function SkeletonCard({ height = 100 }: { height?: number }) {
  return (
    <div
      className="panel sk-pulse"
      style={{
        height,
        background: "#f3f4f6",
        border: "1px solid #e5e7eb",
      }}
    />
  );
}

// 페이지 골격 (page-head + summary cards + member-layout 형태)
export function SkeletonMasterDetail({
  hasSummary = false,
  summaryCount = 4,
}: {
  hasSummary?: boolean;
  summaryCount?: number;
}) {
  return (
    <div className="sk-wrapper">
      <div className="page-head">
        <div>
          <SkeletonBox height={22} width={180} />
          <div style={{ marginTop: 6 }}>
            <SkeletonBox height={14} width={260} />
          </div>
        </div>
      </div>
      {hasSummary && (
        <div className="member-summary">
          {Array.from({ length: summaryCount }).map((_, i) => (
            <SkeletonCard key={i} height={76} />
          ))}
        </div>
      )}
      <div className="grid member-layout">
        <div className="panel elevated">
          <div className="panel-head">
            <SkeletonBox height={16} width={120} />
          </div>
          <div>
            <SkeletonTable rows={10} cols={4} />
          </div>
        </div>
        <div className="panel">
          <div className="panel-head">
            <SkeletonBox height={16} width={100} />
          </div>
          <div className="panel-body">
            <SkeletonBox height={120} radius={10} />
            <div style={{ marginTop: 12 }}>
              <SkeletonBox height={14} />
              <div style={{ marginTop: 6 }}>
                <SkeletonBox height={14} width="80%" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
