-- =====================================================================
--  plab01 — 더미 지점 5개 + 각 지점별 풀스택 더미 시드
--  Supabase > SQL Editor 에 "전체 복사 → 붙여넣기 → Run"
--  · 멱등: 같은 이름 지점/[SEED-MULTI] 학생 있으면 skip
--  · 가입 폼 드롭다운 / 슈퍼어드민 지점 전환 데모용
--  · 정리: 맨 아래 cleanup 블록 주석 해제 후 실행
-- =====================================================================

do $$
declare
  cid uuid;
  this_month text := to_char(current_date, 'YYYY-MM');
  last_month text := to_char((current_date - interval '1 month'), 'YYYY-MM');
  c_idx integer := 0;
  v_seeded integer := 0;
  c_rec record;
begin
  --------------------------------------------------------------- 지점 5개
  -- 없으면 생성. 이미 같은 이름 있으면 skip.
  for c_rec in
    select * from (values
      ('플랜비 강남점',  '서울 강남구 테헤란로 123',     '02-555-0001'),
      ('플랜비 판교점',  '성남 분당구 판교역로 235',     '031-555-0002'),
      ('플랜비 일산점',  '고양 일산서구 중앙로 1456',    '031-555-0003'),
      ('플랜비 송파점',  '서울 송파구 올림픽로 88',      '02-555-0004'),
      ('플랜비 광교점',  '수원 영통구 광교중앙로 145',   '031-555-0005')
    ) as t(name, address, phone)
  loop
    insert into public.centers (name, address, contact_phone, billing_day, report_day)
    select c_rec.name, c_rec.address, c_rec.phone, 10, 1
    where not exists (select 1 from public.centers where name = c_rec.name);
  end loop;

  ---------------------------------------- 각 지점에 풀스택 더미 채우기
  for c_rec in
    select id, name from public.centers
    where name in (
      '플랜비 강남점','플랜비 판교점','플랜비 일산점','플랜비 송파점','플랜비 광교점'
    )
    order by name
  loop
    cid := c_rec.id;
    c_idx := c_idx + 1;

    -- 이미 시드된 지점이면 skip
    if exists (select 1 from public.students where center_id = cid and memo = '[SEED-MULTI]') then
      continue;
    end if;

    ----------------------------------------------------------- 측정 항목
    perform public.seed_measurement_items(cid);

    ----------------------------------------------------------- 상품 5개
    insert into public.products (center_id,name,kind,sessions_per_week,price,billing_cycle,active) values
      (cid,'주 2회 정규반','정규반',2,150000,'월',true),
      (cid,'주 3회 정규반','정규반',3,200000,'월',true),
      (cid,'주 1회 정규반','정규반',1,90000,'월',true),
      (cid,'여름 특강',    '특강',  null,120000,'단건',true),
      (cid,'개인레슨',     '개인레슨',1,300000,'월',true);

    ---------------------------------------------------------- 클래스 3개
    insert into public.classes (center_id,name,sport,level,capacity,coach,days_of_week,start_time,end_time,place,status,schedule) values
      (cid,'초등 배드민턴 A','배드민턴','초급',12,'김코치','월,수,금','17:00','18:30','A코트','운영','월·수·금 17:00~18:30'),
      (cid,'성장 체력 B',   '기초체력','입문',15,'이코치','화,목',   '16:00','17:00','체력장','운영','화·목 16:00~17:00'),
      (cid,'선수반 C',      '배드민턴','선수반', 8,'박코치','월,화,수,목,금','19:00','21:00','A코트','모집중','월~금 19:00~21:00');

    ----------------------------------------------------------- 학생 8명
    -- 지점 인덱스(c_idx)를 학생 이름에 섞어 중복 회피.
    insert into public.students
      (center_id, name, gender, birth, school, grade, status, shuttle_use, route, caution, memo,
       class_id, class_name, product_id, product, phone, parent1_name, parent1_phone)
    select cid,
           s.name || ' (' || c_rec.name || ')',
           s.gender, s.birth::date, s.school, s.grade,
           s.status, s.shuttle, s.route, s.caution, '[SEED-MULTI]',
           cl.id, cl.name, pr.id, pr.name,
           s.phone, s.parent_name, s.parent_phone
    from (values
      ('홍길동','남','2016-03-12','송도초','초3','활성','이용','1호차 송도 A','땅콩 알레르기',
        '초등 배드민턴 A','주 2회 정규반','010-1001-2001','홍부모','010-9001-1001'),
      ('김민재','남','2014-05-01','연수초','초5','활성','미이용',null,null,
        '선수반 C','주 3회 정규반','010-1002-2002','김부모','010-9002-1002'),
      ('이서아','여','2017-08-21','송도초','초2','활성','이용','2호차 청라 B',null,
        '성장 체력 B','주 1회 정규반','010-1003-2003','이부모','010-9003-1003'),
      ('박지우','여','2016-01-09','해송초','초3','활성','미이용',null,null,
        '초등 배드민턴 A','주 2회 정규반','010-1004-2004','박부모','010-9004-1004'),
      ('정서윤','여','2013-11-30','연수중','중1','활성','이용','1호차 송도 A',null,
        '선수반 C','주 3회 정규반','010-1005-2005','정부모','010-9005-1005'),
      ('최유준','남','2015-07-07','송도초','초4','활성','미이용',null,'무릎 보호대 착용',
        '성장 체력 B','주 1회 정규반','010-1006-2006','최부모','010-9006-1006'),
      ('강도윤','남','2012-09-03','연수중','중2','활성','이용','2호차 청라 B',null,
        '선수반 C','개인레슨','010-1007-2007','강부모','010-9007-1007'),
      ('임시우','남','2016-12-12','송도초','초3','대기','미이용',null,null,
        '초등 배드민턴 A','주 2회 정규반','010-1008-2008','임부모','010-9008-1008')
    ) as s(name,gender,birth,school,grade,status,shuttle,route,caution,
           clsname,prdname,phone,parent_name,parent_phone)
    left join public.classes  cl on cl.center_id = cid and cl.name = s.clsname
    left join public.products pr on pr.center_id = cid and pr.name = s.prdname;

    ----------------------------------------------------------- 수강 등록
    insert into public.enrollments (center_id, student_id, class_id, product_id, start_date, billing_start_month, status)
    select cid, st.id, st.class_id, st.product_id,
           current_date - interval '60 days', last_month, '수강중'
    from public.students st
    where st.center_id = cid and st.memo = '[SEED-MULTI]'
      and st.class_id is not null and st.product_id is not null;

    -------------------------------------------------- 이번 달 청구 (확정+완료)
    insert into public.invoices (center_id, student_id, period, amount, status, source, due_date, issued_at, paid_at, method)
    select cid, st.id, this_month, coalesce(pr.price, 0),
           case when (row_number() over (order by st.created_at)) % 3 = 0 then '청구' else '결제완료' end,
           '수강확인',
           (this_month || '-10')::date,
           now() - interval '5 days',
           case when (row_number() over (order by st.created_at)) % 3 = 0 then null else now() - interval '3 days' end,
           'card'
    from public.students st
    left join public.products pr on pr.id = st.product_id
    where st.center_id = cid and st.memo = '[SEED-MULTI]' and st.status = '활성';

    -- 지난 달 청구도 일부 — 미납 데모용 1건
    insert into public.invoices (center_id, student_id, period, amount, status, source, due_date, issued_at)
    select cid, st.id, last_month, coalesce(pr.price, 0),
           '청구', '수강확인',
           (last_month || '-10')::date, now() - interval '35 days'
    from public.students st
    left join public.products pr on pr.id = st.product_id
    where st.center_id = cid and st.memo = '[SEED-MULTI]' and st.status = '활성'
    limit 1;

    -- 결제완료 invoice 에 payments 더미 (POS 영수증용)
    perform public.seed_dummy_payments(cid);

    --------------------------------------------------------------- 문의 1건
    insert into public.inquiries (center_id, requester_name, contact, channel, subject, body, status)
    values
      (cid, '학부모 데모', '010-7777-' || lpad(c_idx::text, 4, '0'),
       '전화', c_rec.name || ' 수업 시간 문의', '주말반 가능 여부 문의드립니다.', '접수');

    ------------------------------------------------- 이번 달 측정 더미 (1명)
    insert into public.measurements (center_id, student_id, measurement_month, status, measured_at)
    select cid, st.id, this_month, '승인완료', now()
    from public.students st
    where st.center_id = cid and st.memo = '[SEED-MULTI]'
    order by st.created_at
    limit 1;

    -- 항목별 더미 값 (3개 카테고리만)
    insert into public.measurement_values (measurement_id, item_id, value_num)
    select m.id, mi.id,
           case mi.name
             when '키'           then 130 + (random()*40)::numeric(5,1)
             when '몸무게'       then 30  + (random()*30)::numeric(5,1)
             when '제자리 멀리뛰기' then 120 + (random()*60)::numeric(5,1)
             else round((random()*100)::numeric, 1)
           end
    from public.measurements m
    join public.measurement_items mi on mi.center_id = cid and mi.active = true
    where m.center_id = cid and m.measurement_month = this_month
      and m.id = (
        select id from public.measurements
         where center_id = cid and measurement_month = this_month
         order by created_at limit 1
      );

    v_seeded := v_seeded + 1;
  end loop;

  raise notice '시드 완료: 새로 채워진 지점 %개', v_seeded;
end $$;

-- =====================================================================
--  ↓ 정리 (cleanup) — 모든 더미 지점 + 그 안의 데이터 일괄 삭제.
--    centers 가 on delete cascade 이므로 지점만 지우면 종속 데이터도 함께 삭제됨.
--    필요할 때만 주석 해제하고 실행.
-- =====================================================================
-- delete from public.centers
--  where name in (
--    '플랜비 강남점','플랜비 판교점','플랜비 일산점','플랜비 송파점','플랜비 광교점'
--  );
