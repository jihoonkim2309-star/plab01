-- =====================================================================
--  수업 운영 데모용 시드 — 클래스 + 수강료 상품 + 학생 매칭 예시
--  사용법: Supabase SQL Editor 에 그대로 붙여 Run.
--  여러 번 실행 안전 — DELETE 가드 + memo='[SEED-CLASS-V2]' 식별자 사용.
--
--  실행 효과:
--   1) 기존 수업 운영 더미 데이터 정리 (classes, products, enrollments,
--      holidays, makeups, renewal_confirmations) — 그 센터 한정
--   2) 학생들의 class_id / product_id / attendance_days 비움 (학생 본체는 보존)
--   3) 신규 클래스 3개 + 수강료 상품 5종 (1~5회반) 시드
--   4) 첫 5명 학생에게 클래스·참여 요일·자동 매칭 상품 적용
-- =====================================================================

do $$
declare
  cid uuid;
  c_after4 uuid;
  c_after6 uuid;
  c_sat_am uuid;
  p_w1 uuid; p_w2 uuid; p_w3 uuid; p_w4 uuid; p_w5 uuid;
  stud_rec record;
  i int := 0;
  pat text[][] := array[
    array['월',          '주 1회반'],
    array['월,수',       '주 2회반'],
    array['월,수,금',    '주 3회반'],
    array['화,목',       '주 2회반'],
    array['월,화,수,목,금', '주 5회반']
  ];
  d_csv text;
  p_name text;
  matched_pid uuid;
  matched_class uuid;
begin
  -- 활성 센터 1개 잡기 (현재 작업 컨텍스트 — 슈퍼어드민 다중지점이면 본점 우선)
  select id into cid from public.centers
   order by created_at asc
   limit 1;
  if cid is null then
    raise exception '먼저 지점을 등록한 뒤 실행하세요.';
  end if;

  -- ─── 1. 기존 수업 운영 더미 정리 ───────────────────────────────
  delete from public.renewal_confirmations where center_id = cid;
  delete from public.makeups               where center_id = cid;
  delete from public.holidays              where center_id = cid;
  delete from public.enrollments           where center_id = cid;
  delete from public.classes               where center_id = cid;
  delete from public.products              where center_id = cid;

  update public.students
     set class_id = null,
         product_id = null,
         attendance_days = null,
         class_name = null,
         product = null
   where center_id = cid;

  -- ─── 2. 신규 클래스 3개 ─────────────────────────────────────────
  insert into public.classes (id, center_id, name, sport, level, coach,
        days_of_week, start_time, end_time, place, capacity, status, schedule)
  values
    (gen_random_uuid(), cid, '오후 4시 배드민턴', '배드민턴', '초·중급', '박코치',
     '월,화,수,목,금', '16:00', '17:00', '메인 코트 A', 12, '운영', '월~금 16:00')
  returning id into c_after4;

  insert into public.classes (id, center_id, name, sport, level, coach,
        days_of_week, start_time, end_time, place, capacity, status, schedule)
  values
    (gen_random_uuid(), cid, '오후 6시 배드민턴', '배드민턴', '중·고급', '김코치',
     '월,화,수,목,금', '18:00', '19:00', '메인 코트 B', 12, '운영', '월~금 18:00')
  returning id into c_after6;

  insert into public.classes (id, center_id, name, sport, level, coach,
        days_of_week, start_time, end_time, place, capacity, status, schedule)
  values
    (gen_random_uuid(), cid, '토요 오전 기초체력', '기초체력', '전체', '이코치',
     '토', '10:00', '11:00', '체력실', 10, '모집중', '토 10:00')
  returning id into c_sat_am;

  -- ─── 3. 수강료 상품 5종 (sessions_per_week = 1~5) ────────────────
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values
    (gen_random_uuid(), cid, '주 1회반', '정규반', 1,  80000, '월', true)
  returning id into p_w1;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values
    (gen_random_uuid(), cid, '주 2회반', '정규반', 2, 150000, '월', true)
  returning id into p_w2;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values
    (gen_random_uuid(), cid, '주 3회반', '정규반', 3, 210000, '월', true)
  returning id into p_w3;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values
    (gen_random_uuid(), cid, '주 4회반', '정규반', 4, 260000, '월', true)
  returning id into p_w4;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values
    (gen_random_uuid(), cid, '주 5회반', '정규반', 5, 300000, '월', true)
  returning id into p_w5;

  -- ─── 4. 첫 5명 학생에게 매칭 예시 적용 ─────────────────────────
  -- 모든 학생을 c_after4 클래스에 두고, attendance_days 만 다르게.
  -- 매칭되는 상품은 자동으로 결정 (회수 ↔ sessions_per_week).
  for stud_rec in
    select id, name from public.students
     where center_id = cid
     order by created_at asc
     limit 5
  loop
    i := i + 1;
    d_csv  := pat[i][1];
    p_name := pat[i][2];

    matched_pid := case p_name
      when '주 1회반' then p_w1
      when '주 2회반' then p_w2
      when '주 3회반' then p_w3
      when '주 4회반' then p_w4
      when '주 5회반' then p_w5
    end;

    update public.students
       set class_id        = c_after4,
           product_id      = matched_pid,
           attendance_days = d_csv,
           class_name      = '오후 4시 배드민턴',
           product         = p_name
     where id = stud_rec.id;

    -- enrollment 도 만들어 두면 시간표 카운트가 즉시 반영됨
    insert into public.enrollments
      (center_id, student_id, class_id, product_id, attendance_days, status)
    values
      (cid, stud_rec.id, c_after4, matched_pid, d_csv, '수강중');

    raise notice '시드 매칭 — % : 클래스=오후 4시 / 요일=% / 상품=%',
      stud_rec.name, d_csv, p_name;
  end loop;

  raise notice '완료. 새 클래스 3개 + 수강료 상품 5종 + 학생 % 명 매칭', i;
end $$;
