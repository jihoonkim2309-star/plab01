// Admin 네비게이션 트리 — index.html 프로토타입 IA 그대로.
// ready=true 인 항목만 실제 기능 구현됨. 나머지는 준비중 플레이스홀더.

export type NavItem = {
  label: string;
  slug: string;
  href: string;
  icon?: string; // 상위 메뉴만
  sub?: boolean;
  ready?: boolean;
};

export type NavGroup = {
  label?: string;
  items: NavItem[];
};

// 준비중 페이지는 /admin/p/<slug> 제네릭 라우트로
const p = (slug: string) => `/admin/p/${slug}`;

export const NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", slug: "dashboard", href: "/admin", icon: "⌂", ready: true },
    ],
  },
  {
    label: "회원",
    items: [
      { label: "회원 목록/상세", slug: "members", href: "/admin/students", icon: "☉", ready: true },
      { label: "학생 등록", slug: "student-create", href: "/admin/students/new", sub: true, ready: true },
      { label: "진학/학년 승급 관리", slug: "grade-promotion", href: p("grade-promotion"), sub: true },
      { label: "학부모 계정 관리", slug: "parent-accounts", href: p("parent-accounts"), sub: true },
      { label: "자녀 연결 승인", slug: "parent-link", href: p("parent-link"), sub: true },
      { label: "학생 계정 관리", slug: "student-accounts", href: p("student-accounts"), sub: true },
      { label: "학생 연결 승인", slug: "student-link", href: p("student-link"), sub: true },
      { label: "코치 계정 관리", slug: "coach-accounts", href: p("coach-accounts"), sub: true },
    ],
  },
  {
    label: "수업 운영",
    items: [
      { label: "클래스 관리", slug: "class-manage", href: p("class-manage"), icon: "□" },
      { label: "클래스 생성", slug: "class-create", href: p("class-create"), sub: true },
      { label: "월간 시간표", slug: "schedule", href: p("schedule"), icon: "□" },
      { label: "휴강일 관리", slug: "holiday-manage", href: p("holiday-manage"), sub: true },
      { label: "보강 일정 관리", slug: "makeup-manage", href: p("makeup-manage"), sub: true },
    ],
  },
  {
    label: "결제",
    items: [
      { label: "수강 상품 관리", slug: "product-manage", href: p("product-manage"), icon: "₩" },
      { label: "다음 달 수강 확인", slug: "renewal-confirm", href: p("renewal-confirm"), sub: true },
      { label: "청구 관리", slug: "billing-manage", href: p("billing-manage"), sub: true },
      { label: "결제 상태", slug: "payment-status", href: p("payment-status"), sub: true },
      { label: "미납 관리", slug: "overdue-manage", href: p("overdue-manage"), sub: true },
    ],
  },
  {
    label: "리포트",
    items: [
      { label: "리포트 관리", slug: "report-list", href: p("report-list"), icon: "▣" },
      { label: "측정 데이터 관리", slug: "report-data", href: p("report-data"), sub: true },
      { label: "측정 항목 관리", slug: "report-template", href: p("report-template"), sub: true },
      { label: "영상 데이터 관리", slug: "video-feedback", href: p("video-feedback"), sub: true },
    ],
  },
  {
    label: "셔틀",
    items: [
      { label: "셔틀 현황", slug: "shuttle", href: p("shuttle"), icon: "◇" },
      { label: "노선/정류장 관리", slug: "route-manage", href: p("route-manage"), sub: true },
      { label: "운행 관리", slug: "bus-run", href: p("bus-run"), sub: true },
      { label: "승하차 로그", slug: "boarding-log", href: p("boarding-log"), sub: true },
      { label: "기사/차량 관리", slug: "driver-manage", href: p("driver-manage"), sub: true },
    ],
  },
  {
    label: "상담",
    items: [
      { label: "문의/채팅", slug: "support", href: p("support"), icon: "✉" },
      { label: "문의 티켓", slug: "inquiry-ticket", href: p("inquiry-ticket"), sub: true },
      { label: "1:1 채팅 상담", slug: "chat-counsel", href: p("chat-counsel"), sub: true },
      { label: "상담 이력", slug: "support-history", href: p("support-history"), sub: true },
    ],
  },
  {
    label: "시스템",
    items: [
      { label: "알림/로그", slug: "logs", href: p("logs"), icon: "≡" },
      { label: "알림 발송 로그", slug: "notification-log", href: p("notification-log"), sub: true },
      { label: "감사 로그", slug: "audit-log", href: p("audit-log"), sub: true },
      { label: "설정", slug: "settings", href: p("settings"), icon: "⚙" },
    ],
  },
];

// 준비중 페이지 제목 lookup
export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((i) => [i.slug, i.label]),
);
