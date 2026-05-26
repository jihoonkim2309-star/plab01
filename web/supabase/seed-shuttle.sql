-- =====================================================================
--  셔틀 데모용 시드 — 본점 한정
--  사용법: Supabase SQL Editor 에 그대로 붙여 Run.
--  여러 번 실행 안전 — 같은 센터 데이터 전체 교체식.
--
--  실행 효과:
--   1) 본점의 기존 셔틀 데이터 정리 (assignments/logs/runs/stops/vehicles/routes)
--   2) 학생들의 shuttle_use/route 비움
--   3) 신규 노선 2개 + 노선별 정류장 + 차량 2대 + 주중 운행 일정
--   4) 첫 6명 학생을 정류장에 배정 (3명씩 두 노선)
--
--  주의: 기사(role=driver) user 가 있어야 운행에 기사 배정됨.
--        없으면 driver_user_id 는 null 로 시드.
-- =====================================================================

do $$
declare
  cid uuid;
  cname text;
  r_morning uuid;  -- 등교
  r_evening uuid;  -- 하교
  v_a uuid;
  v_b uuid;
  drv1 uuid;
  drv2 uuid;

  -- 등교 노선 정류장 IDs
  s_m1 uuid; s_m2 uuid; s_m3 uuid; s_m4 uuid;
  -- 하교 노선 정류장 IDs
  s_e1 uuid; s_e2 uuid; s_e3 uuid; s_e4 uuid;

  stud_rec record;
  i int := 0;
  assigned int := 0;
  stud_days text;

  -- 학생 배정 패턴 (학생 index → 노선·승차·하차)
  pat text[][] := array[
    array['morning', 's_m2', 's_m4'],
    array['morning', 's_m3', 's_m4'],
    array['morning', 's_m1', 's_m4'],
    array['evening', 's_e1', 's_e3'],
    array['evening', 's_e1', 's_e2'],
    array['evening', 's_e1', 's_e4']
  ];
  which text;
  board_key text;
  alight_key text;
  use_route uuid;
  use_board uuid;
  use_alight uuid;
  use_dir text;
begin
  -- 본점 잡기
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

  -- ─── 1. 기존 셔틀 데이터 정리 ─────────────────────────────────
  delete from public.boarding_logs           where center_id = cid;
  delete from public.student_stop_assignments where center_id = cid;
  delete from public.shuttle_runs            where center_id = cid;
  delete from public.shuttle_stops           where center_id = cid;
  delete from public.shuttle_vehicles        where center_id = cid;
  delete from public.shuttle_routes          where center_id = cid;

  update public.students
     set shuttle_use = null,
         route = null
   where center_id = cid;

  -- ─── 2. 노선 2개 ──────────────────────────────────────────────
  insert into public.shuttle_routes (id, center_id, name, direction, status, memo)
  values (gen_random_uuid(), cid, '본점-A 노선 (등교)', '등교', '운영', '아침 등교편')
  returning id into r_morning;

  insert into public.shuttle_routes (id, center_id, name, direction, status, memo)
  values (gen_random_uuid(), cid, '본점-A 노선 (하교)', '하교', '운영', '저녁 하교편')
  returning id into r_evening;

  -- ─── 3. 정류장 (등교: 학원 출발 → 학교/지역, 하교: 학원 → 집 지역) ─
  -- 등교
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_morning, 1, '플랜비 본점 (출발지)', '학원 본점 주소', 0)
  returning id into s_m1;
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_morning, 2, '송도 1단지', '인천 연수구 송도동 1', 8)
  returning id into s_m2;
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_morning, 3, '송도 2단지', '인천 연수구 송도동 2', 14)
  returning id into s_m3;
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_morning, 4, '송도초등학교 정문', '인천 연수구 송도초', 22)
  returning id into s_m4;

  -- 하교
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_evening, 1, '플랜비 본점 (출발지)', '학원 본점 주소', 0)
  returning id into s_e1;
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_evening, 2, '송도 2단지', '인천 연수구 송도동 2', 7)
  returning id into s_e2;
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_evening, 3, '송도 1단지', '인천 연수구 송도동 1', 13)
  returning id into s_e3;
  insert into public.shuttle_stops (id, center_id, route_id, sequence, name, address, est_minutes_from_start)
  values (gen_random_uuid(), cid, r_evening, 4, '청라 A지구', '인천 청라', 25)
  returning id into s_e4;

  -- ─── 4. 차량 2대 ──────────────────────────────────────────────
  insert into public.shuttle_vehicles (id, center_id, name, plate, capacity, status, memo)
  values (gen_random_uuid(), cid, '1호차', '12가 3456', 12, '운영', '본점 셔틀 1호')
  returning id into v_a;

  insert into public.shuttle_vehicles (id, center_id, name, plate, capacity, status, memo)
  values (gen_random_uuid(), cid, '2호차', '34나 5678', 9, '운영', '본점 셔틀 2호')
  returning id into v_b;

  -- ─── 5. 기사 후보 (driver role) — 본점 소속 기사가 있으면 자동 배정
  select id into drv1
    from public.users
   where center_id = cid
     and role = 'driver'
   order by created_at asc
   limit 1;
  select id into drv2
    from public.users
   where center_id = cid
     and role = 'driver'
     and (drv1 is null or id <> drv1)
   order by created_at asc
   limit 1;
  if drv1 is null then
    raise notice '주의: 본점에 driver role user 없음. 운행의 driver_user_id = null';
  end if;

  -- ─── 6. 운행 일정 — 월~금 등교(08:00) + 하교(18:30) ──────────────
  -- weekday: 1=월 ~ 5=금
  for i in 1..5 loop
    insert into public.shuttle_runs
      (center_id, route_id, vehicle_id, driver_user_id, weekday, start_time, end_time, status)
    values
      (cid, r_morning, v_a, drv1, i, time '08:00', time '08:30', '운영'),
      (cid, r_evening, v_b, coalesce(drv2, drv1), i, time '18:30', time '19:00', '운영');
  end loop;
  i := 0;

  -- ─── 7. 학생 배정 — 첫 6명 ─────────────────────────────────────
  for stud_rec in
    select id, name, attendance_days from public.students
     where center_id = cid
     order by created_at asc
     limit 6
  loop
    i := i + 1;
    which     := pat[i][1];
    board_key := pat[i][2];
    alight_key:= pat[i][3];

    if which = 'morning' then
      use_route := r_morning;
      use_dir := '등교';
      use_board  := case board_key
        when 's_m1' then s_m1 when 's_m2' then s_m2 when 's_m3' then s_m3 when 's_m4' then s_m4 end;
      use_alight := case alight_key
        when 's_m1' then s_m1 when 's_m2' then s_m2 when 's_m3' then s_m3 when 's_m4' then s_m4 end;
    else
      use_route := r_evening;
      use_dir := '하교';
      use_board  := case board_key
        when 's_e1' then s_e1 when 's_e2' then s_e2 when 's_e3' then s_e3 when 's_e4' then s_e4 end;
      use_alight := case alight_key
        when 's_e1' then s_e1 when 's_e2' then s_e2 when 's_e3' then s_e3 when 's_e4' then s_e4 end;
    end if;

    -- 학생 수강 요일이 있으면 그대로 이용, 없으면 월~금 default
    stud_days := coalesce(stud_rec.attendance_days, '월,화,수,목,금');

    insert into public.student_stop_assignments
      (center_id, student_id, route_id, board_stop_id, alight_stop_id, direction, weekdays, status)
    values
      (cid, stud_rec.id, use_route, use_board, use_alight, use_dir, stud_days, '활성');

    -- 학생 마스터 비정규화 동기화
    update public.students
       set shuttle_use = '이용',
           route = case which when 'morning' then '본점-A 노선 (등교)' else '본점-A 노선 (하교)' end
     where id = stud_rec.id;

    assigned := assigned + 1;
    raise notice '셔틀 배정 — % : 노선=% / 요일=% / 승차=% / 하차=%',
      stud_rec.name, use_dir, stud_days, board_key, alight_key;
  end loop;

  raise notice '완료. [%] 노선 2개 + 정류장 8개 + 차량 2대 + 운행 10건 + 학생 % 명 배정',
    cname, assigned;
end $$;
