"use client";

// 이번 달 수납 진행도 — Radial bar (단일 arc, % 표시).
import ApexChart from "./ApexClient";

export default function RadialRevenueChart({
  percent,
  paid,
  target,
}: {
  percent: number;
  paid: number;
  target: number;
}) {
  const fmt = (n: number) => `${n.toLocaleString()}원`;
  return (
    <div style={{ position: "relative", width: "100%", maxWidth: 220, margin: "0 auto" }}>
      <ApexChart
        type="radialBar"
        height={220}
        series={[Math.min(100, Math.round(percent))]}
        options={{
          chart: { sparkline: { enabled: true }, animations: { enabled: false } },
          plotOptions: {
            radialBar: {
              startAngle: -120,
              endAngle: 120,
              hollow: { size: "62%" },
              track: { background: "#e3eae6", strokeWidth: "100%" },
              dataLabels: {
                name: { show: false },
                value: {
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#1e794e",
                  offsetY: 6,
                  formatter: (v: number) => `${v}%`,
                },
              },
            },
          },
          fill: {
            type: "gradient",
            gradient: {
              shade: "light",
              type: "vertical",
              gradientToColors: ["#28c76f"],
              stops: [0, 100],
            },
          },
          colors: ["#1e794e"],
          stroke: { lineCap: "round" },
        }}
      />
      <div
        style={{
          textAlign: "center",
          marginTop: 4,
          fontSize: 12,
          color: "var(--muted)",
        }}
      >
        {fmt(paid)} / {fmt(target)}
      </div>
    </div>
  );
}
