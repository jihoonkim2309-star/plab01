-- =====================================================================
--  plab01 — 테스트 더미데이터 시드
--  Supabase > SQL Editor 에 "전체 복사 → 붙여넣기 → Run"
--  · SQL Editor는 소유자 권한이라 RLS 우회됨 (정상)
--  · 학생 memo='[SEED]' 로 표시 → 재실행하면 중복 생성 안 함(가드)
--  · 맨 아래 정리(cleanup) 쿼리로 시드 데이터만 삭제 가능
-- =====================================================================
do $$
declare
  cid uuid;
  next_month text := to_char((current_date + interval '1 month'), 'YYYY-MM');
  this_month text := to_char(current_date, 'YYYY-MM');
begin
  select id into cid from public.centers
    order by (name = '플랜비 본점') desc, created_at asc limit 1;
  if cid is null then
    raise notice '센터가 없습니다. 먼저 부트스트랩으로 센터를 만드세요.';
    return;
  end if;

  if exists (select 1 from public.students where center_id = cid and memo = '[SEED]') then
    raise notice '시드 데이터가 이미 있습니다. (정리 쿼리 후 재실행)';
    return;
  end if;

  ----------------------------------------------------------------- 상품
  insert into public.products (center_id,name,kind,sessions_per_week,price,billing_cycle,active) values
    (cid,'주 2회 정규반','정규반',2,150000,'월',true),
    (cid,'주 3회 정규반','정규반',3,200000,'월',true),
    (cid,'주 1회 정규반','정규반',1,90000,'월',true),
    (cid,'여름 특강','특강',null,120000,'단건',true),
    (cid,'개인레슨','개인레슨',1,300000,'월',true);

  ---------------------------------------------------------------- 클래스
  insert into public.classes (center_id,name,sport,level,capacity,coach,days_of_week,start_time,end_time,place,status,schedule) values
    (cid,'초등 배드민턴 A','배드민턴','초급',12,'김코치','월,수,금','17:00','18:30','A코트','운영','월·수·금 17:00~18:30'),
    (cid,'성장 체력 B','기초체력','입문',15,'이코치','화,목','16:00','17:00','체력장','운영','화·목 16:00~17:00'),
    (cid,'선수반 C','배드민턴','선수반',8,'박코치','월,화,수,목,금','19:00','21:00','A코트','모집중','월~금 19:00~21:00');

  ----------------------------------------------------------------- 학생
  insert into public.students
    (center_id,name,gender,birth,school,grade,sport,level,status,shuttle_use,route,caution,memo,
     class_id, class_name, product_id, product)
  select cid, s.name, s.gender, s.birth::date, s.school, s.grade, s.sport, s.level,
         s.status, s.shuttle, s.route, s.caution, '[SEED]',
         cl.id, cl.name, pr.id, pr.name
  from (values
    ('홍길동','남','2016-03-12','송도초','초3','배드민턴','초급','활성','이용','1호차 송도 A','땅콩 알레르기','초등 배드민턴 A','주 2회 정규반'),
    ('김민재','남','2014-05-01','연수초','초5','배드민턴','선수반','활성','미이용',null,null,'선수반 C','주 3회 정규반'),
    ('이서아','여','2017-08-21','송도초','초2','기초체력','입문','활성','이용','2호차 청라 B',null,'성장 체력 B','주 1회 정규반'),
    ('박지우','여','2016-01-09','해송초','초3','배드민턴','초급','활성','미이용',null,null,'초등 배드민턴 A','주 2회 정규반'),
    ('정서윤','여','2013-11-30','연수중','중1','배드민턴','중급','활성','이용','1호차 송도 A',null,'선수반 C','주 3회 정규반'),
    ('최유준','남','2015-07-07','송도초','초4','기초체력','초급','활성','미이용',null,'무릎 보호대 착용','성장 체력 B','주 1회 정규반'),
    ('오하린','여','2018-02-14','송도초','초1','배드민턴','입문','상담중','미이용',null,null,null,null),
    ('강도윤','남','2012-09-03','연수중','중2','배드민턴','선수반','활성','이용','2호차 청라 B',null,'선수반 C','개인레슨'),
    ('윤채원','여','2017-04-22','해송초','초2','기초체력','입문','휴면','미이용',null,null,null,null),
    ('임시우','남','2016-12-12','송도초','초3','배드민턴','초급','대기','미이용',null,null,'초등 배드민턴 A','주 2회 정규반')
  ) as s(name,gender,birth,school,grade,sport,level,status,shuttle,route,caution,clsname,prdname)
  left join public.classes cl on cl.center_id = cid and cl.name = s.clsname
  left join public.products pr on pr.center_id = cid and pr.name = s.prdname;

  ------------------------------------------------------------- 수강 등록
  insert into public.enrollments (center_id,student_id,class_id,product_id,status,start_date)
  select cid, st.id, st.class_id, st.product_id, '수강중', current_date - 30
  from public.students st
  where st.center_id = cid and st.memo = '[SEED]'
    and st.product_id is not null and st.status = '활성';

  ---------------------------------------------- 다음달 수강확인 (4건 확정)
  insert into public.renewal_confirmations (center_id,enrollment_id,target_month,status,decided_at)
  select cid, e.id, next_month, '확정', now()
  from public.enrollments e
  join public.students st on st.id = e.student_id
  where e.center_id = cid and st.memo = '[SEED]'
  order by st.name
  limit 4;

  ------------------------------------- 청구서 (이번달: 완료1·청구1·미납1)
  -- 결제완료
  insert into public.invoices (center_id,student_id,period,amount,status,source,due_date,issued_at,paid_at,method)
  select cid, st.id, this_month, 150000, '결제완료', '수강확인',
         (this_month||'-10')::date, now(), now(), 'card'
  from public.students st where st.center_id=cid and st.memo='[SEED]' and st.name='홍길동';
  -- 청구(대기)
  insert into public.invoices (center_id,student_id,period,amount,status,source,due_date,issued_at)
  select cid, st.id, this_month, 200000, '청구', '수강확인', (this_month||'-10')::date, now()
  from public.students st where st.center_id=cid and st.memo='[SEED]' and st.name='김민재';
  -- 미납 (납기 10일 지남)
  insert into public.invoices (center_id,student_id,period,amount,status,source,due_date,issued_at)
  select cid, st.id, this_month, 90000, '청구', '수강확인', (current_date - 10), now()
  from public.students st where st.center_id=cid and st.memo='[SEED]' and st.name='이서아';

  ----------------------------------------------------- 진학/학년 승급 2건
  insert into public.grade_promotions
    (center_id,student_id,school_year,from_grade,to_grade,promo_type,status,needs_parent_input,note)
  select cid, st.id, '2026학년도', '초3','초4','일반 승급','진학 확인 필요',false,'[SEED]'
  from public.students st where st.center_id=cid and st.memo='[SEED]' and st.name='박지우';
  insert into public.grade_promotions
    (center_id,student_id,school_year,from_grade,to_grade,promo_type,status,needs_parent_input,note)
  select cid, st.id, '2026학년도', '초6','중1','초등→중등','학부모 입력 요청',true,'[SEED]'
  from public.students st where st.center_id=cid and st.memo='[SEED]' and st.name='정서윤';

  ----------------------------------------------------------- 상담 2건
  insert into public.inquiries (center_id,requester_name,contact,channel,subject,body,status)
  values
    (cid,'홍길동 학부모','010-1234-5678','전화','셔틀 노선 문의','송도 A노선 시간표 알려주세요','접수'),
    (cid,'이서아 학부모','010-2222-3333','웹','수강 변경 문의','주 1회에서 주 2회로 변경 가능한가요?','처리중');
  insert into public.support_messages (center_id,inquiry_id,sender,body)
  select cid, i.id, 'admin', '안녕하세요, 변경 가능합니다. 다음 달부터 적용해 드릴까요?'
  from public.inquiries i where i.center_id=cid and i.subject='수강 변경 문의';

  raise notice '시드 완료: 학생 10, 클래스 3, 상품 5 등 생성됨.';
end $$;

-- =====================================================================
--  정리(cleanup) — 시드 데이터만 삭제하려면 아래 주석 해제 후 실행
-- ---------------------------------------------------------------------
-- do $$
-- declare cid uuid;
-- begin
--   select id into cid from public.centers
--     order by (name='플랜비 본점') desc, created_at asc limit 1;
--   delete from public.inquiries where center_id=cid
--     and subject in ('셔틀 노선 문의','수강 변경 문의');
--   delete from public.grade_promotions where center_id=cid and note='[SEED]';
--   delete from public.invoices where center_id=cid and student_id in
--     (select id from public.students where center_id=cid and memo='[SEED]');
--   delete from public.enrollments where center_id=cid and student_id in
--     (select id from public.students where center_id=cid and memo='[SEED]');
--   delete from public.students where center_id=cid and memo='[SEED]';
--   delete from public.classes where center_id=cid
--     and name in ('초등 배드민턴 A','성장 체력 B','선수반 C');
--   delete from public.products where center_id=cid
--     and name in ('주 2회 정규반','주 3회 정규반','주 1회 정규반','여름 특강','개인레슨');
-- end $$;
-- =====================================================================
