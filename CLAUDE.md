# plab01 — 프로젝트 가이드

> 이 파일은 매 세션 자동으로 읽힙니다. 프로젝트의 변하지 않는 맥락을 적어 둡니다.
> 진행 상태 등 자주 바뀌는 내용은 Claude 메모리에서 별도 관리됩니다.

## 프로젝트란

배드민턴 + 기초체력 학원("플랜비 본점") 운영 관리 시스템.

- 현재 `index.html`(약 8,400줄, 단일 파일, 인라인 CSS/JS, 외부 의존성 없음)은
  **클릭 가능한 프로토타입 / 인터랙티브 명세서**일 뿐이다.
- 실제 서비스는 별도 스택으로 **신규 풀스택 개발**한다.
- 확장 방향: 플랜비 본점 우선 → 이후 지점 모집해 **프랜차이즈(멀티테넌시)**.
- 5개 역할 포털을 한 코드베이스로: Admin / Coach / Parent / Student / Driver.

## 역할 분담

- **사용자 본인**: 사업자등록, PG 심사, 카카오 채널 심사, 법률 판단.
- **Claude**: 코드, 디버깅, 아키텍처, 클라우드 설정, 외부 연동, 배포 안내.
- 사용자는 **개발 경험이 없다.** 설치·설정까지 단계별로 구체적으로 안내할 것.
- 의사소통 언어: **한국어**.

## 확정된 시스템 요건 (변경 금지)

1. 본점 우선 → 프랜차이즈 확장.
2. 코치/기사 포털도 어드민 DB 기반으로 함께 구축.
3. 어드민 제외 모든 역할은 웹 기본 + **하이브리드 앱** 형태 희망.
4. 알림: 1순위 **앱 푸시(FCM)**, 2순위 **카카오 알림톡(Solapi)** fallback.
5. 인바디/아웃바디: 외부 기기 측정 후 **수기 입력** (장비 연동 없음).
6. 셔틀: 차량 부착 **QR을 학생/학부모 앱으로 촬영**.
7. 결제: 어드민이 **매월 N일 지정** → cron 일괄 청구.
8. 리포트: **월 1회 정기 발송**, 발행일도 어드민이 N일 지정 → cron.

## 확정 기술 스택

| 영역 | 선택 |
|---|---|
| 풀스택 | Next.js 16 (App Router, TypeScript) — 단일 코드베이스 (`web/`) |
| DB/인증/스토리지 | Supabase (Postgres + Auth + Storage + RLS), region = Seoul |
| 푸시 | Firebase Cloud Messaging (FCM) |
| 카카오 알림톡 | 솔라피(Solapi) |
| 결제 | 포트원(PortOne) |
| 호스팅 / 스케줄 | Vercel / Vercel Cron |
| 앱 패키징(추후) | Capacitor (PWA → iOS/Android) |
| 멀티테넌시 | 모든 테이블에 `center_id` + Row Level Security |

## Slice 1 (첫 단추, 2~3주)

범위: **Admin 로그인 → 학생 등록/목록/상세/수정이 실제 Supabase DB에 저장 →
Vercel 배포로 인터넷 접속 가능**. 그 외 포털·결제·셔틀·리포트·알림·멀티지점 UI는
다음 슬라이스로 미룬다.

코드 위치: `web/` (Next.js 16 앱). DB 스키마: `web/supabase/schema.sql`.
앱 라우트: `/login`(로그인·가입) · `/admin/students`(목록/등록/상세/수정).
인증·RLS는 Supabase, 키는 `web/.env.local`(gitignore, publishable 키만).

DB 스키마 초안 (5테이블, 모두 `center_id` + RLS):
`centers`(billing_day, report_day) · `users`(role) · `students` ·
`parent_student_links`(pending/linked/rejected) · `student_account_links`.

## 작업 규칙

- `index.html` 수정 시: 화면/동작 의도를 명시적으로 남길 것 (이건 명세서 역할).
- 코드 변경은 작업 단위로 커밋. 커밋 메시지는 영어, 간결하게 (기존 히스토리 스타일).
- 보안: 사용자에게서 Supabase **`service_role` 키는 절대 받지 않는다.** `anon` 키만.
- 새 세션 시작 시 Claude 메모리(`current-status`)에서 마지막 진행 상태를 확인할 것.
