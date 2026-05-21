"use client";

// 회원 상태 분포 — Donut (활성/상담중/대기/휴면)
import ApexChart from "./ApexClient";

export default function MembersDonutChart({
  active,
  consulting,
  waiting,
  dormant,
}: {
  active: number;
  consulting: number;
  waiting: number;
  dormant: number;
}) {
  const total = active + consulting + waiting + dormant;
  return (
    <ApexChart
      type="donut"
      height={260}
      series={[active, consulting, waiting, dormant]}
      options={{
        labels: ["활성", "상담중", "대기", "휴면"],
        colors: ["#28c76f", "#1f6feb", "#ff9f43", "#a5b0ab"],
        stroke: { width: 2, colors: ["#ffffff"] },
        legend: {
          position: "bottom",
          fontSize: "12px",
          fontFamily: "inherit",
          markers: { size: 6 },
          itemMargin: { horizontal: 8, vertical: 4 },
        },
        dataLabels: { enabled: false },
        plotOptions: {
          pie: {
            donut: {
              size: "70%",
              labels: {
                show: true,
                name: { fontSize: "12px", color: "var(--muted)" },
                value: {
                  fontSize: "22px",
                  fontWeight: 800,
                  color: "#2f3b37",
                  formatter: (v: string) => `${v}명`,
                },
                total: {
                  show: true,
                  label: "전체",
                  fontSize: "12px",
                  color: "var(--muted)",
                  formatter: () => `${total}명`,
                },
              },
            },
          },
        },
        tooltip: {
          y: { formatter: (v: number) => `${v}명` },
        },
      }}
    />
  );
}
