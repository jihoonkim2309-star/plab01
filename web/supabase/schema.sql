-- =====================================================================
--  plab01 — Slice 1 DB 스키마
--  Supabase 대시보드 > SQL Editor 에 "전체 복사 → 붙여넣기 → Run"
--  여러 번 실행해도 안전하도록 작성됨 (idempotent).
-- =====================================================================

-- ---------- 0. ENUM 타입 -------------------------------------------------
do $$ begin
  create type user_role as enum ('admin','coach','parent','student','driver');
exception when duplicate_object then null; end $$;

do $$ begin
  create type link_status as enum ('pending','linked','rejected');
exception when duplicate_object then null; end $$;

-- ---------- 1. centers (학원/지점) --------------------------------------
create table if not exists public.centers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  billing_day smallint not null default 10 check (billing_day between 1 and 28),
  report_day  smallint not null default 1  check (report_day  between 1 and 28),
  created_at  timestamptz not null default now()
);

-- ---------- 2. users (auth 사용자 프로필) -------------------------------
create table if not exists public.users (
  id         uuid primary key references auth.users(id) on delete cascade,
  center_id  uuid references public.centers(id) on delete set null,
  role       user_role,
  name       text,
  email      text,
  created_at timestamptz not null default now()
);

-- ---------- 3. students (학생) ------------------------------------------
create table if not exists public.students (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references public.centers(id) on delete cascade,
  name          text not null,
  gender        text check (gender in ('남','여','미입력')) default '미입력',
  birth         date,
  school        text,
  grade         text,
  sport         text,
  level         text,
  status        text not null default '활성',
  class_name    text,
  product       text,
  shuttle_use   text,
  route         text,
  caution       text,
  memo          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ---------- 4. parent_student_links (학부모↔학생 연결요청) --------------
create table if not exists public.parent_student_links (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  parent_id  uuid not null references public.users(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  status     link_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (parent_id, student_id)
);

-- ---------- 5. student_account_links (학생 본인계정 연결) ---------------
create table if not exists public.student_account_links (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  user_id    uuid not null references public.users(id) on delete cascade,
  status     link_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique (student_id, user_id)
);

-- ---------- 6. 헬퍼 함수 (RLS 재귀 방지: SECURITY DEFINER) ---------------
create or replace function public.current_center_id()
returns uuid language sql stable security definer set search_path = public as $$
  select center_id from public.users where id = auth.uid()
$$;

create or replace function public.current_role()
returns user_role language sql stable security definer set search_path = public as $$
  select role from public.users where id = auth.uid()
$$;

-- ---------- 7. 신규 auth 가입 시 users 행 자동 생성 ----------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'name', new.email))
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 8. RLS 활성화 ----------------------------------------------
alter table public.centers               enable row level security;
alter table public.users                 enable row level security;
alter table public.students              enable row level security;
alter table public.parent_student_links  enable row level security;
alter table public.student_account_links enable row level security;

-- centers: 같은 센터 소속이면 조회, 어드민이면 수정 가능
drop policy if exists centers_select on public.centers;
create policy centers_select on public.centers
  for select using (id = public.current_center_id());

drop policy if exists centers_admin_write on public.centers;
create policy centers_admin_write on public.centers
  for update using (id = public.current_center_id() and public.current_role() = 'admin');

-- users: 본인 행은 항상 조회/수정. 어드민은 같은 센터 사용자 조회.
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for select using (id = auth.uid() or
    (center_id = public.current_center_id() and public.current_role() = 'admin'));

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (id = auth.uid());

-- students: 같은 센터의 어드민이 전체 CRUD
drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students
  for all
  using  (center_id = public.current_center_id() and public.current_role() = 'admin')
  with check (center_id = public.current_center_id() and public.current_role() = 'admin');

-- parent_student_links / student_account_links: 같은 센터 어드민이 관리
drop policy if exists psl_admin_all on public.parent_student_links;
create policy psl_admin_all on public.parent_student_links
  for all
  using  (center_id = public.current_center_id() and public.current_role() = 'admin')
  with check (center_id = public.current_center_id() and public.current_role() = 'admin');

drop policy if exists sal_admin_all on public.student_account_links;
create policy sal_admin_all on public.student_account_links
  for all
  using  (center_id = public.current_center_id() and public.current_role() = 'admin')
  with check (center_id = public.current_center_id() and public.current_role() = 'admin');

-- ---------- 9. updated_at 자동 갱신 ------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists students_touch on public.students;
create trigger students_touch before update on public.students
  for each row execute function public.touch_updated_at();

-- ---------- 10. classes (클래스) + 학생 연결 [Phase B 추가] -------------
create table if not exists public.classes (
  id          uuid primary key default gen_random_uuid(),
  center_id   uuid not null references public.centers(id) on delete cascade,
  name        text not null,
  sport       text,
  level       text,
  capacity    integer,
  coach       text,
  schedule    text,                       -- 요일/시간 자유 텍스트 (수업운영 슬라이스에서 정규화 예정)
  status      text not null default '운영',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 학생 → 클래스 실제 연결 (FK). class_name 은 목록 표시용 비정규화 컬럼으로 유지.
alter table public.students
  add column if not exists class_id uuid references public.classes(id) on delete set null;

alter table public.classes enable row level security;

drop policy if exists classes_admin_all on public.classes;
create policy classes_admin_all on public.classes
  for all
  using  (center_id = public.current_center_id() and public.current_role() = 'admin')
  with check (center_id = public.current_center_id() and public.current_role() = 'admin');

drop trigger if exists classes_touch on public.classes;
create trigger classes_touch before update on public.classes
  for each row execute function public.touch_updated_at();

-- =====================================================================
--  11. 전체 도메인 스키마 [어드민 전체] — 리포트/셔틀 제외
--  모든 테이블 center_id + RLS(같은 센터 어드민만). 재실행 안전.
-- =====================================================================

-- 공용: 해당 center 의 어드민인가?
create or replace function public.is_center_admin(cid uuid)
returns boolean language sql stable as $$
  select cid = public.current_center_id() and public.current_role() = 'admin'
$$;

-- centers 설정 컬럼 보강
alter table public.centers add column if not exists contact_phone  text;
alter table public.centers add column if not exists address        text;
alter table public.centers add column if not exists pg_mode        text not null default 'test';   -- test|live
alter table public.centers add column if not exists notify_enabled boolean not null default false;

-- classes 정규화 컬럼 보강
alter table public.classes add column if not exists coach_id     uuid references public.users(id) on delete set null;
alter table public.classes add column if not exists days_of_week text;       -- 예: "월,수,금"
alter table public.classes add column if not exists start_time   time;
alter table public.classes add column if not exists end_time     time;
alter table public.classes add column if not exists place        text;

-- 수강 상품
create table if not exists public.products (
  id               uuid primary key default gen_random_uuid(),
  center_id        uuid not null references public.centers(id) on delete cascade,
  name             text not null,
  kind             text not null default '정규반',     -- 정규반|특강|개인레슨
  sessions_per_week integer,
  price            integer not null default 0,
  billing_cycle    text not null default '월',          -- 월|단건
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
alter table public.students add column if not exists product_id uuid references public.products(id) on delete set null;

-- 수강 등록 (학생-클래스-상품)
create table if not exists public.enrollments (
  id                  uuid primary key default gen_random_uuid(),
  center_id           uuid not null references public.centers(id) on delete cascade,
  student_id          uuid not null references public.students(id) on delete cascade,
  class_id            uuid references public.classes(id) on delete set null,
  product_id          uuid references public.products(id) on delete set null,
  start_date          date,
  billing_start_month text,                              -- YYYY-MM
  status              text not null default '수강중',     -- 수강중|대기|종료
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);

-- 다음 달 수강 확인
create table if not exists public.renewal_confirmations (
  id           uuid primary key default gen_random_uuid(),
  center_id    uuid not null references public.centers(id) on delete cascade,
  enrollment_id uuid not null references public.enrollments(id) on delete cascade,
  target_month text not null,                            -- YYYY-MM
  status       text not null default '대기',              -- 대기|확정|보류
  decided_by   uuid references public.users(id) on delete set null,
  decided_at   timestamptz,
  created_at   timestamptz not null default now(),
  unique (enrollment_id, target_month)
);

-- 청구서
create table if not exists public.invoices (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  period     text not null,                              -- YYYY-MM
  amount     integer not null default 0,
  status     text not null default '대기',               -- 대기|청구|결제완료|실패|환불
  source     text not null default '미청구',             -- 신규|수강확인|미청구
  due_date   date,
  issued_at  timestamptz,
  paid_at    timestamptz,
  method     text,
  pg_tx_id   text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.invoice_items (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references public.centers(id) on delete cascade,
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  enrollment_id uuid references public.enrollments(id) on delete set null,
  label         text not null,
  amount        integer not null default 0
);

-- 결제 시도/결과 (PortOne — pg_mode=test 동안 샌드박스)
create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references public.centers(id) on delete cascade,
  invoice_id    uuid not null references public.invoices(id) on delete cascade,
  amount        integer not null default 0,
  status        text not null default '대기',            -- 대기|성공|실패|환불
  provider      text not null default 'portone',
  pg_tx_id      text,
  receipt_url   text,
  failed_reason text,
  paid_at       timestamptz,
  created_at    timestamptz not null default now()
);

-- 미납 처리 로그
create table if not exists public.overdue_actions (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  action     text not null,                              -- 재청구|알림|메모
  memo       text,
  created_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- 휴강 / 보강
create table if not exists public.holidays (
  id           uuid primary key default gen_random_uuid(),
  center_id    uuid not null references public.centers(id) on delete cascade,
  holiday_date date not null,
  reason       text,
  class_id     uuid references public.classes(id) on delete cascade,   -- null = 전체 휴강
  notify       boolean not null default false,
  created_at   timestamptz not null default now()
);
create table if not exists public.makeups (
  id            uuid primary key default gen_random_uuid(),
  center_id     uuid not null references public.centers(id) on delete cascade,
  class_id      uuid not null references public.classes(id) on delete cascade,
  original_date date,
  makeup_date   date,
  reason        text,
  status        text not null default '예정',            -- 예정|완료|취소
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- 진학 / 학년 승급
create table if not exists public.grade_promotions (
  id           uuid primary key default gen_random_uuid(),
  center_id    uuid not null references public.centers(id) on delete cascade,
  student_id   uuid not null references public.students(id) on delete cascade,
  school_year  text,
  from_grade   text,
  to_grade     text,
  promo_type   text,                                     -- 일반 승급|초등→중등|중등→고등
  status       text not null default '진학 확인 필요',    -- 진학 확인 필요|학부모 입력 요청|승인 완료|보류
  note         text,
  processed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
-- 학교 변경 승급(초6→중1 등) 시 새 학교. 일반 승급이면 null.
alter table public.grade_promotions add column if not exists to_school text;
-- 학부모 입력/승인 필요 여부 (학교 변경이면 true)
alter table public.grade_promotions add column if not exists needs_parent_input boolean not null default false;

-- 상담: 문의 + 메시지
create table if not exists public.inquiries (
  id             uuid primary key default gen_random_uuid(),
  center_id      uuid not null references public.centers(id) on delete cascade,
  requester_name text,
  contact        text,
  channel        text not null default '웹',             -- 웹|전화|앱
  subject        text not null,
  body           text,
  status         text not null default '접수',           -- 접수|처리중|완료
  assignee       uuid references public.users(id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create table if not exists public.support_messages (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  inquiry_id uuid not null references public.inquiries(id) on delete cascade,
  sender     text not null,                              -- admin|customer
  body       text not null,
  created_at timestamptz not null default now()
);

-- 시스템: 알림 발송 로그 / 감사 로그
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  kind       text not null,                              -- push|alimtalk
  recipient  text,
  template   text,
  payload    jsonb,
  status     text not null default '대기',               -- 대기|성공|실패
  provider   text,
  error      text,
  created_at timestamptz not null default now(),
  sent_at    timestamptz
);
create table if not exists public.audit_logs (
  id           uuid primary key default gen_random_uuid(),
  center_id    uuid not null references public.centers(id) on delete cascade,
  actor        uuid references public.users(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    text,
  detail       jsonb,
  created_at   timestamptz not null default now()
);

-- RLS + 정책 (같은 센터 어드민 전체 권한) + updated_at 트리거
do $$
declare t text;
begin
  foreach t in array array[
    'products','enrollments','renewal_confirmations','invoices','invoice_items',
    'payments','overdue_actions','holidays','makeups','grade_promotions',
    'inquiries','support_messages','notifications','audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin_all', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_center_admin(center_id)) with check (public.is_center_admin(center_id))',
      t||'_admin_all', t);
  end loop;

  foreach t in array array[
    'products','enrollments','invoices','makeups','grade_promotions','inquiries'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t||'_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t||'_touch', t);
  end loop;
end $$;

-- ---------- 12. 결제일 자동 청구 (Vercel Cron 이 RPC 호출) -------------
-- SECURITY DEFINER: RLS 우회. 관리자가 '확정'한 수강건만, 이미 청구된 건
-- 제외하고 멱등 생성. 매일 호출되며 billing_day == 오늘인 센터만 처리.
create or replace function public.generate_due_invoices()
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v_period text := to_char(current_date, 'YYYY-MM');
  r record;
begin
  for r in
    select rc.enrollment_id, e.student_id, e.center_id,
           c.billing_day, p.name as pname, p.price as pprice
    from public.renewal_confirmations rc
    join public.enrollments e on e.id = rc.enrollment_id
    join public.centers c on c.id = e.center_id
    left join public.products p on p.id = e.product_id
    where rc.status = '확정'
      and rc.target_month = v_period
      and c.billing_day = extract(day from current_date)::int
      and not exists (
        select 1 from public.invoices i
        where i.student_id = e.student_id and i.period = v_period
      )
  loop
    with ins as (
      insert into public.invoices
        (center_id, student_id, period, amount, status, source, due_date, issued_at)
      values
        (r.center_id, r.student_id, v_period, coalesce(r.pprice,0),
         '청구', '수강확인',
         (v_period || '-' || lpad(least(r.billing_day,28)::text,2,'0'))::date,
         now())
      returning id
    )
    insert into public.invoice_items (center_id, invoice_id, enrollment_id, label, amount)
    select r.center_id, ins.id, r.enrollment_id, coalesce(r.pname,'수강료'),
           coalesce(r.pprice,0)
    from ins;
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- =====================================================================
--  부트스트랩 (최초 1회) — 아래 주석을 해제해서 실행하세요.
--  1) 먼저 앱에서 어드민 계정으로 회원가입(또는 Supabase Auth에서 유저 생성)
--  2) 그 후 아래를 실행해 센터 1개 생성 + 그 계정을 admin으로 승격
-- ---------------------------------------------------------------------
-- insert into public.centers (name) values ('플랜비 본점')
--   returning id;  -- 출력된 id 를 복사
--
-- update public.users
--    set role = 'admin',
--        center_id = '여기에_위에서_복사한_center_id'
--  where email = '여기에_본인_어드민_이메일';
-- =====================================================================
