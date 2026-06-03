// Admin 네비게이션 트리 — index.html 프로토타입 IA 그대로.
// ready=true 인 항목만 실제 기능 구현됨. 나머지는 준비중 플레이스홀더.

export type NavItem = {
  label: string;
  slug: string;
  href: string;
  ready?: boolean;
  // 수정 체크가 필요한 항목 — 사이드바에서 노란색(주황)으로 표시.
  // 기본값(미지정)은 검토 완료 상태.
  needsCheck?: boolean;
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

// 그룹 순서: 일상 빈도가 높은 운영 그룹을 위, 관리·거버넌스 그룹을 아래.
// 그룹 내부 순서: 일상 진입(매일) → 정기 운영(주/월) → 마스터(드물게) 흐름.
export const NAV: NavGroup[] = [
  {
    label: "회원",
    icon: "Users",
    items: [
      { label: "회원 목록/상세", slug: "members", href: "/admin/students", ready: true },
      { label: "학생 등록", slug: "student-create", href: "/admin/students/new", ready: true },
      { label: "학부모 계정 관리", slug: "parent-accounts", href: "/admin/parent-accounts", ready: true },
      { label: "자녀 연결 승인", slug: "parent-link", href: "/admin/parent-links", ready: true },
      { label: "학생 계정 관리", slug: "student-accounts", href: "/admin/student-accounts", ready: true },
      { label: "학생 연결 승인", slug: "student-link", href: "/admin/student-links", ready: true },
      { label: "진학/학년 승급 관리", slug: "grade-promotion", href: "/admin/grade-promotions", ready: true },
    ],
  },
  {
    label: "수업 운영",
    icon: "BookOpen",
    items: [
      { label: "월간 시간표", slug: "schedule", href: "/admin/schedule", ready: true },
      { label: "클래스 관리", slug: "class-manage", href: "/admin/classes", ready: true },
      { label: "클래스 생성", slug: "class-create", href: "/admin/classes/new", ready: true },
      { label: "수강료 상품", slug: "product-manage", href: "/admin/products", ready: true },
      { label: "휴강일 관리", slug: "holiday-manage", href: "/admin/holidays", ready: true },
      { label: "보강 일정 관리", slug: "makeup-manage", href: "/admin/makeups", ready: true },
    ],
  },
  {
    label: "셔틀",
    icon: "Bus",
    items: [
      { label: "셔틀 현황", slug: "shuttle-dashboard", href: "/admin/shuttle/dashboard", ready: true },
      { label: "운행 일정", slug: "shuttle-runs", href: "/admin/shuttle/runs", ready: true },
      { label: "승하차 로그", slug: "shuttle-logs", href: "/admin/shuttle/logs", ready: true },
      { label: "학생 배정", slug: "shuttle-assignments", href: "/admin/shuttle/assignments", ready: true },
      { label: "노선/정류장 관리", slug: "shuttle-routes", href: "/admin/shuttle/routes", ready: true },
      { label: "차량 관리", slug: "shuttle-vehicles", href: "/admin/shuttle/vehicles", ready: true },
    ],
  },
  {
    label: "결제",
    icon: "Wallet",
    items: [
      { label: "다음 달 수강 확인", slug: "renewal-confirm", href: "/admin/renewals", ready: true },
      { label: "청구 관리", slug: "billing-manage", href: "/admin/billing", ready: true },
      { label: "결제 상태", slug: "payment-status", href: "/admin/payment-status", ready: true },
      { label: "미납 관리", slug: "overdue-manage", href: "/admin/overdue", ready: true },
    ],
  },
  {
    label: "리포트",
    icon: "FileText",
    items: [
      { label: "측정 데이터 관리", slug: "report-data", href: "/admin/measurements", ready: true },
      { label: "리포트 관리", slug: "report-list", href: "/admin/reports", ready: true },
      { label: "측정 항목 관리", slug: "report-template", href: "/admin/measurement-items", ready: true },
      { label: "영상 데이터 관리", slug: "video-feedback", href: p("video-feedback") },
    ],
  },
  {
    label: "상담",
    icon: "MessageSquare",
    items: [
      { label: "문의 게시글", slug: "support-posts", href: "/admin/support/posts", ready: true },
      { label: "1:1 채팅", slug: "support-chats", href: "/admin/support/chats", ready: true },
      { label: "전화·방문 기록", slug: "support-offline", href: "/admin/support/offline", ready: true },
    ],
  },
  {
    label: "공지·알림",
    icon: "Megaphone",
    items: [
      { label: "공지사항", slug: "announcements", href: "/admin/announcements", ready: true },
    ],
  },
  {
    label: "직원",
    icon: "UserCog",
    items: [
      { label: "직원 가입 승인", slug: "staff-approvals", href: "/admin/admin-approvals", ready: true },
      { label: "코치 계정 관리", slug: "coach-accounts", href: "/admin/coach-accounts", ready: true },
      { label: "기사 계정 관리", slug: "driver-accounts", href: "/admin/driver-accounts", ready: true },
    ],
  },
  {
    label: "본사",
    icon: "Building2",
    items: [
      { label: "본사 공지", slug: "inbound-notices", href: "/admin/inbound-notices", ready: true },
      { label: "본사에 문의", slug: "branch-inquiries", href: "/admin/branch-inquiries", ready: true },
      { label: "본사 채팅", slug: "branch-chat", href: "/admin/branch-chat", ready: true },
    ],
  },
  {
    label: "프랜차이즈",
    icon: "Building2",
    onlyRoles: ["super_admin"],
    items: [
      { label: "지점장 가입 승인", slug: "admin-approvals", href: "/admin/admin-approvals", ready: true },
      { label: "지점 관리", slug: "centers", href: "/admin/centers", ready: true },
      { label: "본사 청구 관리", slug: "hq-invoices", href: "/admin/hq-invoices", ready: true },
      { label: "본사 공지 발송", slug: "hq-notices", href: "/admin/hq-notices", ready: true },
      { label: "지점 문의", slug: "hq-inquiries", href: "/admin/hq-inquiries", ready: true },
      { label: "지점 채팅", slug: "hq-chat", href: "/admin/hq-chat", ready: true },
    ],
  },
  {
    label: "시스템",
    icon: "Settings",
    onlyRoles: ["super_admin", "admin"],
    items: [
      { label: "설정", slug: "settings", href: "/admin/settings", ready: true },
      { label: "시스템 사용료", slug: "my-hq-invoices", href: "/admin/my-hq-invoices", ready: true },
      { label: "사용자 비밀번호 관리", slug: "users-reset", href: "/admin/users", ready: true },
      { label: "알림 발송 이력", slug: "notification-log", href: "/admin/notifications", ready: true },
      { label: "감사 로그", slug: "audit-log", href: "/admin/audit-logs", ready: true },
    ],
  },
];

// 준비중 페이지 제목 lookup
export const PAGE_TITLES: Record<string, string> = Object.fromEntries(
  NAV.flatMap((g) => g.items).map((i) => [i.slug, i.label]),
);
