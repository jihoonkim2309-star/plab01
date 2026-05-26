// Admin 네비게이션 트리 — index.html 프로토타입 IA 그대로.
// ready=true 인 항목만 실제 기능 구현됨. 나머지는 준비중 플레이스홀더.

export type NavItem = {
  label: string;
  slug: string;
  href: string;
  ready?: boolean;
  // 어드민 sweep 진행 상태. true=검토 완료(초록). 미지정=수정중(빨강) — 팀원 안내용.
  reviewed?: boolean;
};

export type NavGroup = {
  label?: string;
  icon?: string; // lucide 아이콘 이름 — 그룹 헤더에 표시
  items: NavItem[];
  // 이 그룹은 지정 역할에만 노출. 미지정 = 모두 노출.
  onlyRoles?: ("super_admin" | "admin" | "coach")[];
};

// 준비중 페이지는 /admin/p/<slug> 제네릭 라우트로
const p = (slug: string) => `/admin/p/${slug}`;

export const NAV: NavGroup[] = [
  {
    label: "프랜차이즈",
    icon: "Building2",
    onlyRoles: ["super_admin"],
    items: [
      { label: "지점 관리", slug: "centers", href: "/admin/centers", ready: true, reviewed: true },
      { label: "지점장 가입 승인", slug: "admin-approvals", href: "/admin/admin-approvals", ready: true, reviewed: true },
      { label: "본사 청구 관리", slug: "hq-invoices", href: "/admin/hq-invoices", ready: true, reviewed: true },
    ],
  },
  {
    label: "회원",
    icon: "Users",
    items: [
      { label: "회원 목록/상세", slug: "members", href: "/admin/students", ready: true, reviewed: true },
      { label: "학생 등록", slug: "student-create", href: "/admin/students/new", ready: true, reviewed: true },
      { label: "진학/학년 승급 관리", slug: "grade-promotion", href: "/admin/grade-promotions", ready: true },
      { label: "학부모 계정 관리", slug: "parent-accounts", href: "/admin/parent-accounts", ready: true },
      { label: "자녀 연결 승인", slug: "parent-link", href: "/admin/parent-links", ready: true },
      { label: "학생 계정 관리", slug: "student-accounts", href: "/admin/student-accounts", ready: true },
      { label: "학생 연결 승인", slug: "student-link", href: "/admin/student-links", ready: true },
    ],
  },
  {
    label: "직원",
    icon: "UserCog",
    items: [
      { label: "코치 계정 관리", slug: "coach-accounts", href: "/admin/coach-accounts", ready: true, reviewed: true },
      { label: "기사 계정 관리", slug: "driver-accounts", href: "/admin/driver-accounts", ready: true, reviewed: true },
      { label: "직원 가입 승인", slug: "staff-approvals", href: "/admin/admin-approvals", ready: true, reviewed: true },
    ],
  },
  {
    label: "수업 운영",
    icon: "BookOpen",
    items: [
      { label: "클래스 관리", slug: "class-manage", href: "/admin/classes", ready: true },
      { label: "클래스 생성", slug: "class-create", href: "/admin/classes/new", ready: true },
      { label: "월간 시간표", slug: "schedule", href: "/admin/schedule", ready: true },
      { label: "휴강일 관리", slug: "holiday-manage", href: "/admin/holidays", ready: true },
      { label: "보강 일정 관리", slug: "makeup-manage", href: "/admin/makeups", ready: true },
    ],
  },
  {
    label: "결제",
    icon: "Wallet",
    items: [
      { label: "수강 상품 관리", slug: "product-manage", href: "/admin/products", ready: true, reviewed: true },
      { label: "다음 달 수강 확인", slug: "renewal-confirm", href: "/admin/renewals", ready: true, reviewed: true },
      { label: "청구 관리", slug: "billing-manage", href: "/admin/billing", ready: true, reviewed: true },
      { label: "결제 상태", slug: "payment-status", href: "/admin/payment-status", ready: true, reviewed: true },
      { label: "미납 관리", slug: "overdue-manage", href: "/admin/overdue", ready: true, reviewed: true },
      { label: "본사 청구서 (받음)", slug: "my-hq-invoices", href: "/admin/my-hq-invoices", ready: true, reviewed: true },
    ],
  },
  {
    label: "리포트",
    icon: "FileText",
    items: [
      { label: "리포트 관리", slug: "report-list", href: "/admin/reports", ready: true, reviewed: true },
      { label: "측정 데이터 관리", slug: "report-data", href: "/admin/measurements", ready: true, reviewed: true },
      { label: "측정 항목 관리", slug: "report-template", href: "/admin/measurement-items", ready: true, reviewed: true },
      { label: "영상 데이터 관리", slug: "video-feedback", href: p("video-feedback") },
    ],
  },
  {
    label: "셔틀",
    icon: "Bus",
    items: [
      { label: "노선/정류장 관리", slug: "shuttle-routes", href: "/admin/shuttle/routes", ready: true },
      { label: "차량 관리", slug: "shuttle-vehicles", href: "/admin/shuttle/vehicles", ready: true },
      { label: "운행 일정", slug: "shuttle-runs", href: "/admin/shuttle/runs", ready: true },
      { label: "학생 배정", slug: "shuttle-assignments", href: "/admin/shuttle/assignments", ready: true },
      { label: "승하차 로그", slug: "shuttle-logs", href: p("shuttle-logs") },
      { label: "셔틀 현황", slug: "shuttle-dashboard", href: p("shuttle-dashboard") },
    ],
  },
  {
    label: "상담",
    icon: "MessageSquare",
    items: [
      { label: "문의/채팅", slug: "support", href: "/admin/support", ready: true, reviewed: true },
      { label: "문의 티켓", slug: "inquiry-ticket", href: "/admin/support", ready: true, reviewed: true },
      { label: "1:1 채팅 상담", slug: "chat-counsel", href: "/admin/support", ready: true, reviewed: true },
      { label: "상담 이력", slug: "support-history", href: "/admin/support?s=완료", ready: true, reviewed: true },
    ],
  },
  {
    label: "시스템",
    icon: "Settings",
    onlyRoles: ["super_admin", "admin"],
    items: [
      { label: "알림/로그", slug: "logs", href: "/admin/notifications", ready: true, reviewed: true },
      { label: "알림 발송 로그", slug: "notification-log", href: "/admin/notifications", ready: true, reviewed: true },
      { label: "감사 로그", slug: "audit-log", href: "/admin/audit-logs", ready: true, reviewed: true },
      { label: "사용자 비밀번호 관리", slug: "users-reset", href: "/admin/users", ready: true, reviewed: true },
      { label: "설정", slug: "settings", href: "/admin/settings", ready: true, reviewed: true },
    ],
  },
];

// 준비중 페이지 제목 lookup
export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((i) => [i.slug, i.label]),
);
