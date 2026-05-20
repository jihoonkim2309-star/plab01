export const REPORT_TYPES = [
  "신체성장",
  "기록",
  "체력측정",
  "배드민턴측정",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// 어떤 카테고리가 어떤 리포트 유형에 들어가는지
export const TYPE_CATEGORIES: Record<ReportType, string[]> = {
  신체성장: ["신체", "바디비율", "밸런스"],
  체력측정: ["체력", "밸런스"],
  배드민턴측정: ["배드민턴", "밸런스"],
  기록: [],
};
