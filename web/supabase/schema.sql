-- =====================================================================
--  plab01 — Slice 1 DB 스키마
--  Supabase 대시보드 > SQL Editor 에 "전체 복사 → 붙여넣기 → Run"
--  여러 번 실행해도 안전하도록 작성됨 (idempotent).
-- =====================================================================

-- ---------- 0. ENUM 타입 -------------------------------------------------
do $$ begin
  create type user_role as enum ('admin','coach','parent','student','driver');
exception when duplicate_object then null; end $$;

-- super_admin: 모든 센터 통합 관리 + 어드민 가입 승인 권한. 후행 추가 (enum 확장).
alter type user_role add value if not exists 'super_admin';

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
-- 가입자는 role=null + center_id=null 의 "승인 대기" 상태로 들어온다.
-- 이름/연락처는 가입 폼이 raw_user_meta_data 에 넣어 보낸 값을 그대로 저장.
-- 슈퍼 어드민이 /admin/admin-approvals 에서 센터를 지정하며 role='admin' 으로 승격.
-- 이메일 자동 확인은 테스트 단계 한정 — 슈퍼 어드민 수동 승인이 추가 게이트라 유지.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_apply uuid;
  v_role  text;
begin
  begin
    v_apply := nullif(new.raw_user_meta_data->>'applying_center_id', '')::uuid;
  exception when others then
    v_apply := null;
  end;
  v_role := nullif(new.raw_user_meta_data->>'applying_role', '');
  if v_role not in ('admin','coach','driver') then v_role := null; end if;

  insert into public.users (id, email, name, phone, applying_center_id, applying_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', new.email),
    new.raw_user_meta_data->>'phone',
    v_apply,
    v_role
  )
  on conflict (id) do update
    set name               = coalesce(public.users.name,  excluded.name),
        phone              = coalesce(public.users.phone, excluded.phone),
        applying_center_id = coalesce(public.users.applying_center_id, excluded.applying_center_id),
        applying_role      = coalesce(public.users.applying_role,      excluded.applying_role);

  -- 이메일 자동 확인 (테스트 단계 — 확인 메일 없이 즉시 로그인 가능)
  update auth.users
     set email_confirmed_at = coalesce(email_confirmed_at, now())
   where id = new.id;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- 7b. 슈퍼어드민 헬퍼 + 가입 신청 지점 컬럼 -------------------
-- super_admin: 전역 관리자. 모든 센터 조회/수정 + 어드민 가입 승인 + 신규 지점 생성.
create or replace function public.is_super_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(
    (select role::text = 'super_admin' from public.users where id = auth.uid()),
    false
  )
$$;

-- 가입 시 신청한 지점 (대기 상태 동안만 의미. 승인되면 center_id 로 옮겨감).
alter table public.users add column if not exists applying_center_id uuid
  references public.centers(id) on delete set null;

-- 가입 시 신청한 역할 (admin|coach|driver). 슈퍼어드민/지점장이 승인 시 그 역할 부여.
alter table public.users add column if not exists applying_role text
  check (applying_role in ('admin','coach','driver'));

-- ---------- 8. RLS 활성화 ----------------------------------------------
alter table public.centers               enable row level security;
alter table public.users                 enable row level security;
alter table public.students              enable row level security;
alter table public.parent_student_links  enable row level security;
alter table public.student_account_links enable row level security;

-- centers: 같은 센터 소속이면 조회. super_admin 은 모두. admin 은 자기 센터 수정.
drop policy if exists centers_select on public.centers;
create policy centers_select on public.centers
  for select using (id = public.current_center_id() or public.is_super_admin());

drop policy if exists centers_admin_write on public.centers;
create policy centers_admin_write on public.centers
  for update using (
    public.is_super_admin()
    or (id = public.current_center_id() and public.current_role() = 'admin')
  );

drop policy if exists centers_super_insert on public.centers;
create policy centers_super_insert on public.centers
  for insert with check (public.is_super_admin());

drop policy if exists centers_super_delete on public.centers;
create policy centers_super_delete on public.centers
  for delete using (public.is_super_admin());

-- users: 본인 OR super_admin OR 같은 센터 admin OR 자기 센터로 신청한 pending 사용자(승인 대기 목록).
drop policy if exists users_self on public.users;
create policy users_self on public.users
  for select using (
    id = auth.uid()
    or public.is_super_admin()
    or (center_id = public.current_center_id() and public.current_role() = 'admin')
    or (applying_center_id = public.current_center_id() and public.current_role() = 'admin')
  );

-- 본인 OR super_admin OR (해당 사용자가 자기 센터 신청자/소속이고 본인은 그 센터 admin)
drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (
    id = auth.uid()
    or public.is_super_admin()
    or (
      public.current_role() = 'admin'
      and (
        center_id = public.current_center_id()
        or applying_center_id = public.current_center_id()
      )
    )
  );

-- students: 같은 센터의 어드민(또는 super_admin)이 전체 CRUD
drop policy if exists students_admin_all on public.students;
create policy students_admin_all on public.students
  for all
  using  (public.is_center_admin(center_id))
  with check (public.is_center_admin(center_id));

-- parent_student_links / student_account_links: 같은 센터 어드민이 관리
drop policy if exists psl_admin_all on public.parent_student_links;
create policy psl_admin_all on public.parent_student_links
  for all
  using  (public.is_center_admin(center_id))
  with check (public.is_center_admin(center_id));

drop policy if exists sal_admin_all on public.student_account_links;
create policy sal_admin_all on public.student_account_links
  for all
  using  (public.is_center_admin(center_id))
  with check (public.is_center_admin(center_id));

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

-- 공용: 해당 center 의 어드민인가? (super_admin 은 모든 센터 통과)
create or replace function public.is_center_admin(cid uuid)
returns boolean language sql stable as $$
  select public.is_super_admin()
      or (cid = public.current_center_id() and public.current_role() = 'admin')
$$;

-- centers 설정 컬럼 보강
alter table public.centers add column if not exists contact_phone  text;
alter table public.centers add column if not exists address        text;
alter table public.centers add column if not exists pg_mode        text not null default 'test';   -- test|live
alter table public.centers add column if not exists notify_enabled boolean not null default false;
-- 센터별 PG(PortOne) 설정 — 프랜차이즈: 지점마다 자기 PG 키
alter table public.centers add column if not exists pg_store_id    text;
alter table public.centers add column if not exists pg_channel_key text;
alter table public.centers add column if not exists pg_api_secret  text;

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

-- ---------- 13. 학생 사진 (Supabase Storage) --------------------------
alter table public.students add column if not exists photo_url text;
-- 학생 본인 연락처·주소
alter table public.students add column if not exists phone   text;
alter table public.students add column if not exists address text;
-- 어드민이 등록 시 입력하는 보호자 연락처 (참조용)
-- 학부모 본인이 포털로 가입하면 그 사람 정보는 users 테이블에 들어가고
-- parent_student_links 로 학생과 연결됨 — 별개로 관리.
alter table public.students add column if not exists parent1_name  text;
alter table public.students add column if not exists parent1_phone text;
alter table public.students add column if not exists parent2_name  text;
alter table public.students add column if not exists parent2_phone text;
-- users 에 phone (학부모·코치 등 모든 역할 공용)
alter table public.users add column if not exists phone text;

-- 공개 읽기 버킷 (식별용 사진). 재실행 안전.
insert into storage.buckets (id, name, public)
values ('student-photos', 'student-photos', true)
on conflict (id) do nothing;

-- 로그인한 사용자(어드민)는 업로드/수정/삭제, 공개 읽기
drop policy if exists student_photos_read on storage.objects;
create policy student_photos_read on storage.objects
  for select using (bucket_id = 'student-photos');

drop policy if exists student_photos_write on storage.objects;
create policy student_photos_write on storage.objects
  for insert to authenticated with check (bucket_id = 'student-photos');

drop policy if exists student_photos_update on storage.objects;
create policy student_photos_update on storage.objects
  for update to authenticated using (bucket_id = 'student-photos');

drop policy if exists student_photos_delete on storage.objects;
create policy student_photos_delete on storage.objects
  for delete to authenticated using (bucket_id = 'student-photos');

-- =====================================================================
--  14. 리포트 / 측정 — Phase 1 실구현 (2026-05-20 추가)
--  - measurement_items : 항목 마스터(센터별, 어드민 관리)
--  - measurements      : 학생×월 측정 컨테이너(상태 워크플로)
--  - measurement_values: 항목별 값
--  - reports           : 월간 리포트(4종 유형, snapshot으로 동결)
--  RLS: 어드민 전권 + 코치는 측정 read/write 가능. 승인/발행은 코드에서 admin만.
-- =====================================================================

-- 공용: 해당 center 의 어드민 또는 코치(=staff)인가? (super_admin 통과)
create or replace function public.is_center_staff(cid uuid)
returns boolean language sql stable as $$
  select public.is_super_admin()
      or (cid = public.current_center_id()
          and public.current_role() in ('admin','coach'))
$$;

-- 가입 폼용 지점 목록 RPC (anon 호출 가능 — 이름·id 만 노출).
create or replace function public.list_centers_for_signup()
returns table(id uuid, name text)
language sql security definer set search_path = public as $$
  select id, name from public.centers order by name;
$$;
grant execute on function public.list_centers_for_signup() to anon, authenticated;

-- 14.1 측정 항목 마스터
create table if not exists public.measurement_items (
  id          uuid primary key default gen_random_uuid(),
  center_id   uuid not null references public.centers(id) on delete cascade,
  category    text not null,                  -- 신체|바디비율|체력|배드민턴|밸런스
  name        text not null,
  unit        text,                            -- cm|kg|%|sec|점 등
  value_kind  text not null default 'number',  -- number|text
  sort_order  integer not null default 0,
  active      boolean not null default true,
  icon        text,                            -- 리포트에 표시될 아이콘(이모지 권장: 📏 💪 🎯)
  created_at  timestamptz not null default now(),
  unique (center_id, name)
);
-- 기존 행 보강 (재실행 안전)
alter table public.measurement_items add column if not exists icon text;
alter table public.measurement_items add column if not exists icon_url text;  -- 업로드한 SVG/이미지 공개 URL
alter table public.measurement_items add column if not exists icon_hidden boolean not null default false;  -- true 면 업로드/SVG 매핑 둘 다 안 그림 (어드민이 명시적으로 아이콘 안 보이게)

-- 측정 항목 아이콘 업로드 버킷 (공개 읽기, 인증 사용자가 쓰기)
insert into storage.buckets (id, name, public)
values ('measurement-item-icons', 'measurement-item-icons', true)
on conflict (id) do nothing;

drop policy if exists mii_read   on storage.objects;
create policy mii_read   on storage.objects
  for select using (bucket_id = 'measurement-item-icons');
drop policy if exists mii_write  on storage.objects;
create policy mii_write  on storage.objects
  for insert to authenticated with check (bucket_id = 'measurement-item-icons');
drop policy if exists mii_update on storage.objects;
create policy mii_update on storage.objects
  for update to authenticated using (bucket_id = 'measurement-item-icons');
drop policy if exists mii_delete on storage.objects;
create policy mii_delete on storage.objects
  for delete to authenticated using (bucket_id = 'measurement-item-icons');

-- 14.2 학생×월 측정 컨테이너
create table if not exists public.measurements (
  id                uuid primary key default gen_random_uuid(),
  center_id         uuid not null references public.centers(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  measurement_month text not null,            -- YYYY-MM
  status            text not null default '대기',  -- 대기|입력완료|승인완료|반려
  measured_by       uuid references public.users(id) on delete set null,
  measured_at       timestamptz,
  reviewed_by       uuid references public.users(id) on delete set null,
  reviewed_at       timestamptz,
  reject_reason     text,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (student_id, measurement_month)
);

-- 14.3 항목별 값
create table if not exists public.measurement_values (
  measurement_id  uuid not null references public.measurements(id) on delete cascade,
  item_id         uuid not null references public.measurement_items(id) on delete restrict,
  value_num       numeric,
  value_text      text,
  primary key (measurement_id, item_id)
);

-- 14.4 월간 리포트 (한 측정에서 유형별 N개 생성 가능)
create table if not exists public.reports (
  id                uuid primary key default gen_random_uuid(),
  center_id         uuid not null references public.centers(id) on delete cascade,
  student_id        uuid not null references public.students(id) on delete cascade,
  measurement_id    uuid references public.measurements(id) on delete set null,
  report_month      text not null,            -- YYYY-MM
  report_type       text not null,            -- 신체성장|기록|체력측정|배드민턴측정
  status            text not null default '생성대기',  -- 생성대기|생성완료|발행완료
  snapshot          jsonb,                     -- 발행 시점 동결(섹션·값·점수·코멘트)
  coach_comment     text,
  admin_comment     text,
  published_at      timestamptz,
  public_to_parent  boolean not null default false,
  generated_by      uuid references public.users(id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  unique (student_id, report_month, report_type)
);

-- 14.5 인덱스
create index if not exists idx_measurements_center_month on public.measurements (center_id, measurement_month);
create index if not exists idx_measurements_status       on public.measurements (status);
create index if not exists idx_reports_center_month_type on public.reports (center_id, report_month, report_type);
create index if not exists idx_reports_status            on public.reports (status);

-- 14.6 updated_at 트리거
drop trigger if exists measurements_touch on public.measurements;
create trigger measurements_touch before update on public.measurements
  for each row execute function public.touch_updated_at();

drop trigger if exists reports_touch on public.reports;
create trigger reports_touch before update on public.reports
  for each row execute function public.touch_updated_at();

-- 14.7 RLS
alter table public.measurement_items  enable row level security;
alter table public.measurements       enable row level security;
alter table public.measurement_values enable row level security;
alter table public.reports            enable row level security;

-- measurement_items: staff read, admin write
drop policy if exists mi_staff_read  on public.measurement_items;
create policy mi_staff_read  on public.measurement_items
  for select using (public.is_center_staff(center_id));

drop policy if exists mi_admin_write on public.measurement_items;
create policy mi_admin_write on public.measurement_items
  for all using (public.is_center_admin(center_id))
     with check (public.is_center_admin(center_id));

-- measurements: staff read/insert/update, admin delete (승인/발행은 액션 레벨에서 추가 가드)
drop policy if exists m_staff_read   on public.measurements;
create policy m_staff_read   on public.measurements
  for select using (public.is_center_staff(center_id));

drop policy if exists m_staff_insert on public.measurements;
create policy m_staff_insert on public.measurements
  for insert with check (public.is_center_staff(center_id));

drop policy if exists m_staff_update on public.measurements;
create policy m_staff_update on public.measurements
  for update using (public.is_center_staff(center_id))
             with check (public.is_center_staff(center_id));

drop policy if exists m_admin_delete on public.measurements;
create policy m_admin_delete on public.measurements
  for delete using (public.is_center_admin(center_id));

-- measurement_values: 부모 measurement 의 center 권한 따름
drop policy if exists mv_staff_all   on public.measurement_values;
create policy mv_staff_all   on public.measurement_values
  for all using (exists (
        select 1 from public.measurements m
         where m.id = measurement_id and public.is_center_staff(m.center_id)
      ))
  with check (exists (
        select 1 from public.measurements m
         where m.id = measurement_id and public.is_center_staff(m.center_id)
      ));

-- reports: admin 전권, coach read만
drop policy if exists r_admin_all    on public.reports;
create policy r_admin_all    on public.reports
  for all using (public.is_center_admin(center_id))
     with check (public.is_center_admin(center_id));

drop policy if exists r_coach_read   on public.reports;
create policy r_coach_read   on public.reports
  for select using (public.is_center_staff(center_id));

-- =====================================================================
--  14.8 측정 항목 시드 — 프로토타입 항목 그대로 (재실행 안전, 센터별)
--  사용: select public.seed_measurement_items('<center_id>');
--  - SQL Editor 직접 실행: auth.uid() = null 이라 통과
--  - 앱 RPC 호출: 해당 센터 admin 만 통과
-- =====================================================================
create or replace function public.seed_measurement_items(cid uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v record;
begin
  if auth.uid() is not null and not public.is_center_admin(cid) then
    raise exception 'permission denied: not center admin';
  end if;

  -- 14.8a 구버전 → 신버전 마이그레이션 (재실행 안전)
  -- 카테고리 5개: 신체·바디사이즈·바디비율·기초체력·배드민턴
  -- 측정값(measurement_values)은 item_id로 묶여있어 rename해도 보존됨
  update public.measurement_items set name='팔-키'
   where center_id=cid and name='팔-키 비율';
  update public.measurement_items set category='바디사이즈'
   where center_id=cid and name in ('어깨너비','허리둘레');
  update public.measurement_items set category='기초체력'
   where center_id=cid and category='체력' and name in ('제자리 멀리뛰기','20m 달리기');
  update public.measurement_items set category='배드민턴'
   where center_id=cid and category='체력' and name='스텝 테스트';
  update public.measurement_items set category='배드민턴', name='정확도'
   where center_id=cid and name='정확도 테스트';
  update public.measurement_items set name='반응속도'
   where center_id=cid and name='풋워크 스피드';
  update public.measurement_items set name='라켓 컨트롤'
   where center_id=cid and name='랠리 지속';
  -- 더 이상 사용 안 하는 항목 비활성화
  update public.measurement_items set active=false
   where center_id=cid
     and (category='밸런스' or name='서비스 정확도' or category='체력');

  -- 14.8b 신버전 항목 시드 (재실행 안전)
  for v in
    select * from (values
      ('신체',     '키',              '📏','cm',   'number', 10),
      ('신체',     '몸무게',          '⚖️','kg',   'number', 20),
      ('신체',     '골격근량',        '💪','kg',   'number', 30),
      ('신체',     '체지방률',        '🔥','%',    'number', 40),
      ('바디사이즈','어깨너비',       '🤸','cm',   'number', 110),
      ('바디사이즈','허리둘레',       '📏','cm',   'number', 120),
      ('바디사이즈','골반둘레',       '📐','cm',   'number', 130),
      ('바디사이즈','팔길이',         '📐','cm',   'number', 140),
      ('바디사이즈','다리길이',       '📐','cm',   'number', 150),
      ('바디비율', '얼굴-어깨',       '📊','%',    'number', 210),
      ('바디비율', '얼굴-키',         '📊','%',    'number', 220),
      ('바디비율', '팔-키',           '📊','%',    'number', 230),
      ('바디비율', '상하체 비율',     '📊','비율', 'number', 240),
      ('기초체력', '제자리 멀리뛰기', '🦘','cm',   'number', 310),
      ('기초체력', '수직 점프',       '⚡','cm',   'number', 320),
      ('기초체력', '20m 달리기',      '🏃','sec',  'number', 330),
      ('배드민턴', '스텝 테스트',     '👟','회',   'number', 410),
      ('배드민턴', '반응속도',        '⏱','sec',  'number', 420),
      ('배드민턴', '라켓 컨트롤',     '🏸','회',   'number', 430),
      ('배드민턴', '정확도',          '🎯','%',    'number', 440)
    ) as t(category, name, icon, unit, value_kind, sort_order)
  loop
    insert into public.measurement_items
      (center_id, category, name, icon, unit, value_kind, sort_order, active)
    values
      (cid, v.category, v.name, v.icon, v.unit, v.value_kind, v.sort_order, true)
    on conflict (center_id, name) do update
      set category   = excluded.category,
          unit       = excluded.unit,
          value_kind = excluded.value_kind,
          sort_order = excluded.sort_order,
          active     = true,
          icon       = coalesce(public.measurement_items.icon, excluded.icon);
    if found then v_count := v_count + 1; end if;
  end loop;

  return v_count;
end $$;

-- =====================================================================
--  15. payments 카드 정보 확장 (POS 매출조회 스타일 상세에 필요)
-- =====================================================================
alter table public.payments add column if not exists method               text;
alter table public.payments add column if not exists card_name            text;
alter table public.payments add column if not exists card_number_masked   text;
alter table public.payments add column if not exists installment_months   integer;
alter table public.payments add column if not exists approval_no          text;
alter table public.payments add column if not exists raw                  jsonb;

-- =====================================================================
--  15.1 더미 결제 정보 시드 — 결제완료 invoice 인데 payments 가 없거나 부족한 경우
--  카드사·마스크된 번호·승인번호 등 더미 채워주기 (테스트 모드 전용).
--  사용: select public.seed_dummy_payments('<center_id>');
-- =====================================================================
create or replace function public.seed_dummy_payments(cid uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  v_count integer := 0;
  v record;
  v_card text;
  v_masked text;
  v_approval text;
  v_install integer;
  v_now timestamptz := now();
begin
  if auth.uid() is not null and not public.is_center_admin(cid) then
    raise exception 'permission denied: not center admin';
  end if;

  -- 결제완료 인데 payment 레코드 자체가 없거나 카드정보가 비어있는 invoice 들
  for v in
    select i.id, i.center_id, i.amount, i.paid_at
      from public.invoices i
      left join public.payments p
        on p.invoice_id = i.id and p.status = '성공'
       and p.card_name is not null
     where i.center_id = cid
       and i.status = '결제완료'
       and p.id is null
  loop
    -- 학생 ID 해시로 결정적인 더미값 만들기 (재실행해도 동일)
    v_card := (array['신한카드','삼성카드','국민카드','현대카드','롯데카드','BC카드','우리카드','농협카드'])
              [1 + (abs(hashtext(v.id::text)) % 8)];
    v_masked := lpad((abs(hashtext(v.id::text || 'a')) % 9000 + 1000)::text, 4, '0')
              || '-****-****-'
              || lpad((abs(hashtext(v.id::text || 'b')) % 9000 + 1000)::text, 4, '0');
    v_approval := lpad((abs(hashtext(v.id::text || 'c')) % 90000000 + 10000000)::text, 8, '0');
    v_install := case when v.amount >= 200000 then ((abs(hashtext(v.id::text || 'd')) % 5) + 1) * 0 else 0 end;
    if v.amount >= 200000 and (abs(hashtext(v.id::text)) % 3) = 0 then
      v_install := 3;  -- 큰 금액 일부는 할부
    end if;

    insert into public.payments
      (center_id, invoice_id, amount, status, provider, pg_tx_id,
       method, card_name, card_number_masked, installment_months, approval_no,
       receipt_url, paid_at, raw)
    values
      (v.center_id, v.id, v.amount, '성공', 'portone-dummy',
       'dummy-' || substr(v.id::text, 1, 8) || '-' || extract(epoch from v_now)::bigint,
       'card', v_card, v_masked, v_install, v_approval,
       'https://example.com/receipt/dummy-' || substr(v.id::text, 1, 8),
       coalesce(v.paid_at, v_now),
       jsonb_build_object(
         'dummy', true,
         'card', jsonb_build_object('name', v_card, 'number', v_masked),
         'installment_months', v_install,
         'approval_no', v_approval
       ));
    v_count := v_count + 1;
  end loop;

  return v_count;
end $$;

-- ---------- 15. 셔틀 (노선/정류장/차량/운행/배정/이력) [Phase 1 어드민] ---

-- 노선
create table if not exists public.shuttle_routes (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  name       text not null,
  direction  text not null default '등교',                -- 등교|하교|순환
  status     text not null default '운영',                -- 운영|중단
  memo       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 노선상 정류장 (순서)
create table if not exists public.shuttle_stops (
  id                     uuid primary key default gen_random_uuid(),
  center_id              uuid not null references public.centers(id) on delete cascade,
  route_id               uuid not null references public.shuttle_routes(id) on delete cascade,
  sequence               integer not null default 0,
  name                   text not null,
  address                text,
  lat                    double precision,
  lng                    double precision,
  est_minutes_from_start integer,
  created_at             timestamptz not null default now()
);
create index if not exists shuttle_stops_route_idx
  on public.shuttle_stops (route_id, sequence);

-- 차량 (차량별 QR 토큰)
create table if not exists public.shuttle_vehicles (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  name       text not null,
  plate      text,
  capacity   integer,
  qr_token   text not null unique default replace(gen_random_uuid()::text, '-', ''),
  status     text not null default '운영',                -- 운영|점검|폐기
  memo       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 운행 일정 (노선 x 차량 x 기사 x 요일 x 시각)
create table if not exists public.shuttle_runs (
  id             uuid primary key default gen_random_uuid(),
  center_id      uuid not null references public.centers(id) on delete cascade,
  route_id       uuid not null references public.shuttle_routes(id) on delete cascade,
  vehicle_id     uuid references public.shuttle_vehicles(id) on delete set null,
  driver_user_id uuid references public.users(id) on delete set null,
  weekday        smallint not null,                        -- 0=일 ~ 6=토
  start_time     time not null,
  end_time       time,
  status         text not null default '운영',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists shuttle_runs_route_idx
  on public.shuttle_runs (route_id, weekday, start_time);

-- 학생-정류장 배정 (등교/하교 정류장)
create table if not exists public.student_stop_assignments (
  id             uuid primary key default gen_random_uuid(),
  center_id      uuid not null references public.centers(id) on delete cascade,
  student_id     uuid not null references public.students(id) on delete cascade,
  route_id       uuid references public.shuttle_routes(id) on delete set null,
  board_stop_id  uuid references public.shuttle_stops(id) on delete set null,
  alight_stop_id uuid references public.shuttle_stops(id) on delete set null,
  direction      text,                                     -- 등교|하교|순환|null=공통
  status         text not null default '활성',             -- 활성|중지
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists student_stop_assignments_student_idx
  on public.student_stop_assignments (student_id);

-- 승하차 이력 (Phase 2 부터 기록 — 테이블만 미리)
create table if not exists public.boarding_logs (
  id         uuid primary key default gen_random_uuid(),
  center_id  uuid not null references public.centers(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  vehicle_id uuid references public.shuttle_vehicles(id) on delete set null,
  run_id     uuid references public.shuttle_runs(id) on delete set null,
  stop_id    uuid references public.shuttle_stops(id) on delete set null,
  action     text not null,                                -- 승차|하차
  scanned_at timestamptz not null default now(),
  scanned_by uuid references public.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists boarding_logs_student_idx
  on public.boarding_logs (student_id, scanned_at desc);
create index if not exists boarding_logs_run_idx
  on public.boarding_logs (run_id, scanned_at desc);

-- RLS + updated_at 트리거 (셔틀 6 테이블)
do $$
declare t text;
begin
  foreach t in array array[
    'shuttle_routes','shuttle_stops','shuttle_vehicles','shuttle_runs',
    'student_stop_assignments','boarding_logs'
  ] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', t||'_admin_all', t);
    execute format(
      'create policy %I on public.%I for all using (public.is_center_admin(center_id)) with check (public.is_center_admin(center_id))',
      t||'_admin_all', t);
  end loop;

  foreach t in array array[
    'shuttle_routes','shuttle_vehicles','shuttle_runs','student_stop_assignments'
  ] loop
    execute format('drop trigger if exists %I on public.%I', t||'_touch', t);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.touch_updated_at()',
      t||'_touch', t);
  end loop;
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
