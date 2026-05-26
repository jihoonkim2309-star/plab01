-- =====================================================================
--  수업 운영 데모용 시드 — 본점 한정
--  사용법: Supabase SQL Editor 에 그대로 붙여 Run.
--  여러 번 실행 안전 — 같은 센터 데이터 전체 교체식.
--
--  실행 효과:
--   1) 본점의 기존 수업 운영 더미 정리 (classes, products, enrollments,
--      holidays, makeups, renewal_confirmations)
--   2) 본점 학생들의 class_id / product_id / attendance_days 비움
--   3) 신규 클래스 3개 + 수강료 상품 5종 시드
--   4) 첫 5명 학생에게 클래스·참여 요일·자동 매칭 상품 적용
-- =====================================================================

do $$
declare
  cid uuid;
  cname text;
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
begin
  -- 본점 잡기 — 이름에 '본점' 포함된 센터 우선, 없으면 가장 먼저 만든 센터
  select id, name into cid, cname
    from public.centers
   where name ilike '%본점%'
   order by created_at asc
   limit 1;
  if cid is null then
    select id, name into cid, cname
      from public.centers
     order by created_at asc
     limit 1;
  end if;
  if cid is null then
    raise exception '센터가 하나도 등록되어 있지 않습니다.';
  end if;
  raise notice '대상 센터: % (id=%)', cname, cid;

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
  values (gen_random_uuid(), cid, '주 1회반', '정규반', 1,  80000, '월', true) returning id into p_w1;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values (gen_random_uuid(), cid, '주 2회반', '정규반', 2, 150000, '월', true) returning id into p_w2;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values (gen_random_uuid(), cid, '주 3회반', '정규반', 3, 210000, '월', true) returning id into p_w3;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values (gen_random_uuid(), cid, '주 4회반', '정규반', 4, 260000, '월', true) returning id into p_w4;
  insert into public.products (id, center_id, name, kind, sessions_per_week, price, billing_cycle, active)
  values (gen_random_uuid(), cid, '주 5회반', '정규반', 5, 300000, '월', true) returning id into p_w5;

  -- ─── 4. 첫 5명 학생에게 매칭 예시 적용 ─────────────────────────
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

    insert into public.enrollments
      (center_id, student_id, class_id, product_id, attendance_days, status)
    values
      (cid, stud_rec.id, c_after4, matched_pid, d_csv, '수강중');

    raise notice '시드 매칭 — % : 요일=% / 상품=%', stud_rec.name, d_csv, p_name;
  end loop;

  raise notice '완료. [%] 클래스 3개 + 수강료 상품 5종 + 학생 %명 매칭', cname, i;
end $$;
