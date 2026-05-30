-- =====================================================================
--  plab01 — 페이지 응답 속도 개선용 인덱스
--  실행: Supabase Dashboard > SQL Editor > 전체 복사 > Run
--  멱등 (IF NOT EXISTS) — 여러 번 실행해도 안전.
--  효과: 자주 조회되는 컬럼 조합에 B-tree 인덱스 추가 → 쿼리 ~30-50% 단축.
-- =====================================================================

-- ---------- 회원 (students) ----------
-- 회원 목록·필터 (center_id + status)
CREATE INDEX IF NOT EXISTS students_center_status_idx
  ON public.students (center_id, status);
-- 최근 가입 정렬 (대시보드)
CREATE INDEX IF NOT EXISTS students_center_created_idx
  ON public.students (center_id, created_at DESC);
-- 학생명 검색 (ilike) — pg_trgm 확장 + GIN. 필요 시 활성화.
-- CREATE EXTENSION IF NOT EXISTS pg_trgm;
-- CREATE INDEX IF NOT EXISTS students_name_trgm_idx
--   ON public.students USING gin (name gin_trgm_ops);

-- ---------- 청구 (invoices) ----------
-- 월별 청구 조회 (청구 관리)
CREATE INDEX IF NOT EXISTS invoices_center_period_idx
  ON public.invoices (center_id, period);
-- 상태 필터 (청구 / 결제완료 / 환불 등)
CREATE INDEX IF NOT EXISTS invoices_center_status_idx
  ON public.invoices (center_id, status);
-- 미납 관리 (status IN ('청구','실패') + due_date < today)
CREATE INDEX IF NOT EXISTS invoices_center_due_idx
  ON public.invoices (center_id, due_date)
  WHERE status IN ('청구', '실패');
-- 학생별 청구 조회 (학생 상세, 결제 상태)
CREATE INDEX IF NOT EXISTS invoices_center_student_idx
  ON public.invoices (center_id, student_id);

-- ---------- 결제 (payments) ----------
-- 결제 내역·차트 (최근 결제, 7일 수납)
CREATE INDEX IF NOT EXISTS payments_center_status_paid_idx
  ON public.payments (center_id, status, paid_at DESC);
-- 청구별 결제 조회 (결제 상세)
CREATE INDEX IF NOT EXISTS payments_invoice_idx
  ON public.payments (invoice_id);

-- ---------- 수강 등록 (enrollments) ----------
-- 활성 수강 (학생 페이지, 다음 달 수강 확인)
CREATE INDEX IF NOT EXISTS enrollments_center_status_idx
  ON public.enrollments (center_id, status);
-- 학생별 enrollment
CREATE INDEX IF NOT EXISTS enrollments_center_student_idx
  ON public.enrollments (center_id, student_id);

-- ---------- 다음 달 수강 확인 (renewal_confirmations) ----------
CREATE INDEX IF NOT EXISTS renewal_confirmations_center_month_idx
  ON public.renewal_confirmations (center_id, target_month);

-- ---------- 학부모/학생 연결 (links) ----------
-- 학생별 연결 학부모 조회 (학생 상세)
CREATE INDEX IF NOT EXISTS parent_links_center_student_idx
  ON public.parent_student_links (center_id, student_id);
CREATE INDEX IF NOT EXISTS parent_links_center_status_idx
  ON public.parent_student_links (center_id, status);
-- 학생 계정 연결
CREATE INDEX IF NOT EXISTS student_links_center_student_idx
  ON public.student_account_links (center_id, student_id);
CREATE INDEX IF NOT EXISTS student_links_center_status_idx
  ON public.student_account_links (center_id, status);

-- ---------- 진학 / 학년 승급 ----------
CREATE INDEX IF NOT EXISTS grade_promotions_center_status_idx
  ON public.grade_promotions (center_id, status);

-- ---------- 클래스 / 상품 ----------
CREATE INDEX IF NOT EXISTS classes_center_status_idx
  ON public.classes (center_id, status);
CREATE INDEX IF NOT EXISTS products_center_active_idx
  ON public.products (center_id, active);

-- ---------- 휴강 / 보강 (대시보드 오늘·다가오는 7일) ----------
CREATE INDEX IF NOT EXISTS holidays_center_date_idx
  ON public.holidays (center_id, holiday_date);
CREATE INDEX IF NOT EXISTS makeups_center_date_idx
  ON public.makeups (center_id, makeup_date);

-- ---------- 측정 / 리포트 (이미 일부 있음 — 보강) ----------
-- 학생별 측정 (학생 상세)
CREATE INDEX IF NOT EXISTS measurements_center_student_idx
  ON public.measurements (center_id, student_id);
-- 학생별 리포트 (학생 상세)
CREATE INDEX IF NOT EXISTS reports_center_student_idx
  ON public.reports (center_id, student_id);

-- ---------- 알림 (대시보드 최근 5개) ----------
CREATE INDEX IF NOT EXISTS notifications_center_created_idx
  ON public.notifications (center_id, created_at DESC);

-- ---------- 셔틀 배정 (셔틀 현황 / 학생 배정) ----------
CREATE INDEX IF NOT EXISTS shuttle_assignments_center_status_idx
  ON public.student_stop_assignments (center_id, status);

-- =====================================================================
--  실행 후 확인 — 현재 인덱스 목록
-- =====================================================================
SELECT
  schemaname,
  tablename,
  indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
