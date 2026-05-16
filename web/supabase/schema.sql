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
