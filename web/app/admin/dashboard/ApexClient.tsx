"use client";

// ApexCharts SSR 비지원 → dynamic({ ssr: false }) 로 래핑한 공용 클라이언트 엔트리.
// 각 차트 위젯은 이 파일을 import 해서 옵션·시리즈만 정의.
import dynamic from "next/dynamic";

const ApexChart = dynamic(() => import("react-apexcharts"), { ssr: false });

export default ApexChart;
