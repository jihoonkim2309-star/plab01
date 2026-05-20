// 월간 통합 리포트 1종 (이전 4종 분리 → 사용자 요청으로 단일화, 2026-05-20)
export const REPORT_TYPES = ["월간"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

// 리포트 섹션 순서 (이 순서대로 PDF에 출력)
export const REPORT_CATEGORIES: string[] = [
  "신체",
  "바디사이즈",
  "바디비율",
  "기초체력",
  "배드민턴",
];

// 섹션 표시 이름 (리포트 헤더용)
export const CATEGORY_TITLES: Record<string, string> = {
  신체: "최근 3개월 변화",
  바디사이즈: "바디 사이즈 변화",
  바디비율: "바디 비율 변화",
  기초체력: "기초체력 변화",
  배드민턴: "배드민턴 테스트 변화",
};

// 호환용 (기존 import 깨지지 않게 유지)
export const TYPE_CATEGORIES: Record<ReportType, string[]> = {
  월간: REPORT_CATEGORIES,
};
