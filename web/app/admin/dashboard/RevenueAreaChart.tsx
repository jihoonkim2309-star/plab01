"use client";

// 최근 7일 일별 수납액 — Area chart
import ApexChart from "./ApexClient";

export default function RevenueAreaChart({
  data,
}: {
  data: { date: string; amount: number }[];
}) {
  return (
    <ApexChart
      type="area"
      height={240}
      series={[{ name: "수납액", data: data.map((d) => d.amount) }]}
      options={{
        chart: {
          toolbar: { show: false },
          zoom: { enabled: false },
          parentHeightOffset: 0,
        },
        colors: ["#1e794e"],
        stroke: { curve: "smooth", width: 3 },
        fill: {
          type: "gradient",
          gradient: {
            shadeIntensity: 1,
            opacityFrom: 0.45,
            opacityTo: 0.05,
            stops: [0, 90, 100],
          },
        },
        grid: {
          borderColor: "#e3eae6",
          strokeDashArray: 4,
          padding: { left: 12, right: 12 },
        },
        dataLabels: { enabled: false },
        xaxis: {
          categories: data.map((d) => d.date.slice(5)),
          axisBorder: { show: false },
          axisTicks: { show: false },
          labels: { style: { colors: "var(--muted)", fontSize: "11px" } },
        },
        yaxis: {
          labels: {
            style: { colors: "var(--muted)", fontSize: "11px" },
            formatter: (v: number) =>
              v >= 10000 ? `${Math.round(v / 10000)}만` : `${v}`,
          },
        },
        tooltip: {
          y: { formatter: (v: number) => `${v.toLocaleString()}원` },
        },
      }}
    />
  );
}
