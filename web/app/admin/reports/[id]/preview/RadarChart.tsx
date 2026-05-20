// 신체 능력 밸런스 5축 레이더 차트
// 점수는 buildSnapshot에서 항목별 측정값 → 0-100 정규화 → 카테고리 평균으로 산출됨.

export type BalanceScores = {
  파워: number;
  스피드: number;
  민첩성: number;
  균형성: number;
  협응성: number;
};

const AXES: { key: keyof BalanceScores; angle: number; sub: string }[] = [
  { key: "파워", angle: -90, sub: "힘 & 폭발력" },
  { key: "스피드", angle: -18, sub: "속도 능력" },
  { key: "민첩성", angle: 54, sub: "움직임 효율성" },
  { key: "균형성", angle: 126, sub: "신체 밸런스" },
  { key: "협응성", angle: 198, sub: "조절 & 정확성" },
];

function ptAt(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = (angleDeg * Math.PI) / 180;
  return [cx + Math.cos(rad) * r, cy + Math.sin(rad) * r] as [number, number];
}

export default function RadarChart({
  scores,
  size = 360,
}: {
  scores: BalanceScores;
  size?: number;
}) {
  const cx = size / 2;
  const cy = size / 2;
  const maxR = size / 2 - 70; // label space

  const gridLevels = [0.25, 0.5, 0.75, 1.0];
  const polygonAt = (ratio: number) =>
    AXES.map((a) => ptAt(cx, cy, maxR * ratio, a.angle))
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + " Z";

  const gridPaths = gridLevels.map(polygonAt);
  const scorePts = AXES.map((a) =>
    ptAt(cx, cy, (maxR * scores[a.key]) / 100, a.angle),
  );
  const scorePath =
    scorePts
      .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
      .join(" ") + " Z";

  // 기준선(포준평균 자리 — 50점)
  const refPath = polygonAt(0.5);

  // 축 라인
  const axisLines = AXES.map((a) => ptAt(cx, cy, maxR, a.angle));

  // 라벨 위치 (꼭지점 바깥)
  const labels = AXES.map((a) => {
    const [lx, ly] = ptAt(cx, cy, maxR + 28, a.angle);
    return { ...a, lx, ly, score: scores[a.key] };
  });

  // 눈금 라벨 (위쪽 축에만 표시)
  const ticks = [25, 50, 75, 100];

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      style={{ display: "block", margin: "0 auto" }}
    >
      {/* 격자 오각형 */}
      {gridPaths.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          stroke="#D3D1C7"
          strokeWidth={1}
        />
      ))}

      {/* 축 라인 */}
      {axisLines.map(([x, y], i) => (
        <line
          key={i}
          x1={cx}
          y1={cy}
          x2={x}
          y2={y}
          stroke="#D3D1C7"
          strokeWidth={1}
        />
      ))}

      {/* 기준선(포준평균 50점) — 점선 */}
      <path
        d={refPath}
        fill="none"
        stroke="#6E6B62"
        strokeWidth={1.2}
        strokeDasharray="4 4"
      />

      {/* 점수 다각형 */}
      <path
        d={scorePath}
        fill="#5DCAA5"
        fillOpacity={0.28}
        stroke="#0F6E56"
        strokeWidth={2}
        strokeLinejoin="round"
      />

      {/* 점수 꼭지점 도트 */}
      {scorePts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={4} fill="#0F6E56" />
      ))}

      {/* 눈금 숫자 (오른쪽 위 사선 축 위에만 가볍게) */}
      {ticks.map((t) => {
        const [tx, ty] = ptAt(cx, cy, maxR * (t / 100), -18);
        return (
          <text
            key={t}
            x={tx + 4}
            y={ty - 2}
            fontSize={9}
            fill="#888780"
          >
            {t}
          </text>
        );
      })}

      {/* 축 라벨 + 부제 + 점수 */}
      {labels.map((l, i) => (
        <g key={i}>
          <text
            x={l.lx}
            y={l.ly - 16}
            fontSize={13}
            fontWeight={700}
            textAnchor="middle"
            fill="#04342C"
          >
            {l.key}
          </text>
          <text
            x={l.lx}
            y={l.ly}
            fontSize={10}
            textAnchor="middle"
            fill="#6E6B62"
          >
            ({l.sub})
          </text>
          <text
            x={l.lx}
            y={l.ly + 20}
            fontSize={18}
            fontWeight={700}
            textAnchor="middle"
            fill="#0F6E56"
          >
            {l.score}
          </text>
        </g>
      ))}
    </svg>
  );
}
