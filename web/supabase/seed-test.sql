-- =====================================================================
--  플랜비 본점 통합 테스트 시드 — 3월~5월 100명 다양한 상태
--  실행: Supabase Dashboard > SQL Editor > 전체 복사 > Run
--  ⚠ 본점 모든 도메인 데이터 DELETE 후 INSERT (학부모 계정·연결은 보존).
--  ⚠ 멱등 X — 다시 실행하면 학생 ID 가 새로 생성됨.
-- =====================================================================

DO $$
DECLARE
  cid uuid;
  v_route_in_id  uuid;
  v_route_out_id uuid;
  v_stop_in_1 uuid; v_stop_in_2 uuid; v_stop_in_3 uuid;
  v_stop_out_1 uuid; v_stop_out_2 uuid; v_stop_out_3 uuid;
  v_vehicle_a uuid; v_vehicle_b uuid;
  v_class_a uuid; v_class_b uuid; v_class_c uuid;
  v_prod_1 uuid; v_prod_2 uuid; v_prod_3 uuid; v_prod_5 uuid;
  -- 학생 루프
  i int;
  v_student_id uuid;
  v_enrollment_id uuid;
  v_status text;
  v_name text;
  v_school text;
  v_grade text;
  v_birth date;
  v_gender text;
  v_class_id uuid;
  v_prod_id uuid;
  v_prod_price int;
  v_attendance_days text;
  v_invoice_id uuid;
  -- 월별 루프
  m int;
  v_period text;
  v_due date;
  v_invoice_status text;
  v_pay_method text;
  v_meas_id uuid;
  v_meas_status text;
  v_report_status text;
  v_paid_at timestamptz;
  v_published_at timestamptz;
  -- 성씨·이름 풀
  v_surnames text[] := ARRAY['김','이','박','최','정','강','조','윤','장','임','한','오','서','신','권','황','안','송','홍','문'];
  v_givennames text[] := ARRAY['민재','서아','도윤','지우','하준','시우','예준','주원','유준','시현','지호','예린','은서','다은','수아','연우','지원','서윤','민준','지안','채원','윤서','수빈','은우','지훈','하린','시윤','선우','지원','우진'];
  v_schools text[] := ARRAY['플랜비초','플랜비중','한빛초','새봄초','샛별중','한솔초','은빛중'];
BEGIN
  -- 0. 본점 center_id
  SELECT id INTO cid FROM public.centers WHERE name = '플랜비 본점' LIMIT 1;
  IF cid IS NULL THEN
    RAISE EXCEPTION '플랜비 본점 센터가 없습니다. 먼저 centers 에 추가하세요.';
  END IF;

  -- 1. 도메인 데이터 정리 (FK 순서 주의 — 자식부터)
  DELETE FROM public.boarding_logs           WHERE center_id = cid;
  DELETE FROM public.student_stop_assignments WHERE center_id = cid;
  DELETE FROM public.shuttle_runs            WHERE center_id = cid;
  DELETE FROM public.shuttle_stops           WHERE center_id = cid;
  DELETE FROM public.shuttle_routes          WHERE center_id = cid;
  DELETE FROM public.shuttle_vehicles        WHERE center_id = cid;
  DELETE FROM public.overdue_actions         WHERE center_id = cid;
  DELETE FROM public.payments                WHERE center_id = cid;
  DELETE FROM public.invoice_items           WHERE center_id = cid;
  DELETE FROM public.invoices                WHERE center_id = cid;
  DELETE FROM public.renewal_confirmations   WHERE center_id = cid;
  DELETE FROM public.measurement_values
    WHERE measurement_id IN (SELECT id FROM public.measurements WHERE center_id = cid);
  DELETE FROM public.measurements            WHERE center_id = cid;
  DELETE FROM public.reports                 WHERE center_id = cid;
  DELETE FROM public.makeups                 WHERE center_id = cid;
  DELETE FROM public.holidays                WHERE center_id = cid;
  DELETE FROM public.grade_promotions        WHERE center_id = cid;
  DELETE FROM public.notifications           WHERE center_id = cid;
  DELETE FROM public.enrollments             WHERE center_id = cid;
  DELETE FROM public.parent_student_links    WHERE center_id = cid;
  DELETE FROM public.student_account_links   WHERE center_id = cid;
  DELETE FROM public.students                WHERE center_id = cid;
  -- 마스터(products·classes·measurement_items) 는 살림 — 재시드만

  -- 2. 마스터: 측정 항목 (기존 RPC, 멱등)
  PERFORM public.seed_measurement_items(cid);

  -- 3. 마스터: 상품 4종 (이미 있으면 그대로)
  INSERT INTO public.products (center_id, name, kind, sessions_per_week, price)
  SELECT cid, '주1회 정규반', '정규반', 1, 80000
   WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE center_id = cid AND name = '주1회 정규반');
  INSERT INTO public.products (center_id, name, kind, sessions_per_week, price)
  SELECT cid, '주2회 정규반', '정규반', 2, 150000
   WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE center_id = cid AND name = '주2회 정규반');
  INSERT INTO public.products (center_id, name, kind, sessions_per_week, price)
  SELECT cid, '주3회 정규반', '정규반', 3, 200000
   WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE center_id = cid AND name = '주3회 정규반');
  INSERT INTO public.products (center_id, name, kind, sessions_per_week, price)
  SELECT cid, '주5회 집중반', '정규반', 5, 300000
   WHERE NOT EXISTS (SELECT 1 FROM public.products WHERE center_id = cid AND name = '주5회 집중반');

  SELECT id, price INTO v_prod_1, v_prod_price FROM public.products WHERE center_id = cid AND name = '주1회 정규반' LIMIT 1;
  SELECT id INTO v_prod_2 FROM public.products WHERE center_id = cid AND name = '주2회 정규반' LIMIT 1;
  SELECT id INTO v_prod_3 FROM public.products WHERE center_id = cid AND name = '주3회 정규반' LIMIT 1;
  SELECT id INTO v_prod_5 FROM public.products WHERE center_id = cid AND name = '주5회 집중반' LIMIT 1;

  -- 4. 마스터: 클래스 3종
  INSERT INTO public.classes (center_id, name, sport, level, capacity, coach, days_of_week, start_time, end_time, place, color)
  SELECT cid, '정규반 A', '배드민턴', '초급', 20, '김코치', '월,수,금', '17:00', '18:30', '본점 1코트', 'green'
   WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE center_id = cid AND name = '정규반 A');
  INSERT INTO public.classes (center_id, name, sport, level, capacity, coach, days_of_week, start_time, end_time, place, color)
  SELECT cid, '정규반 B', '배드민턴', '중급', 20, '이코치', '화,목', '17:00', '18:30', '본점 2코트', 'blue'
   WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE center_id = cid AND name = '정규반 B');
  INSERT INTO public.classes (center_id, name, sport, level, capacity, coach, days_of_week, start_time, end_time, place, color)
  SELECT cid, '집중반', '배드민턴', '고급', 12, '박코치', '월,화,수,목,금', '19:00', '20:30', '본점 1코트', 'orange'
   WHERE NOT EXISTS (SELECT 1 FROM public.classes WHERE center_id = cid AND name = '집중반');

  SELECT id INTO v_class_a FROM public.classes WHERE center_id = cid AND name = '정규반 A' LIMIT 1;
  SELECT id INTO v_class_b FROM public.classes WHERE center_id = cid AND name = '정규반 B' LIMIT 1;
  SELECT id INTO v_class_c FROM public.classes WHERE center_id = cid AND name = '집중반' LIMIT 1;

  -- 5. 마스터: 셔틀 노선·정류장·차량·운행
  INSERT INTO public.shuttle_routes (center_id, name, direction, status)
  VALUES (cid, '북부 등교', '등교', '운영') RETURNING id INTO v_route_in_id;
  INSERT INTO public.shuttle_routes (center_id, name, direction, status)
  VALUES (cid, '북부 하교', '하교', '운영') RETURNING id INTO v_route_out_id;

  INSERT INTO public.shuttle_stops (center_id, route_id, sequence, name, address, est_minutes_from_start, est_source)
  VALUES (cid, v_route_in_id, 1, '북부역', '서울시 강북구', 0, 'manual') RETURNING id INTO v_stop_in_1;
  INSERT INTO public.shuttle_stops (center_id, route_id, sequence, name, address, est_minutes_from_start, est_source)
  VALUES (cid, v_route_in_id, 2, '도서관 사거리', '서울시 강북구', 8, 'fallback') RETURNING id INTO v_stop_in_2;
  INSERT INTO public.shuttle_stops (center_id, route_id, sequence, name, address, est_minutes_from_start, est_source)
  VALUES (cid, v_route_in_id, 3, '플랜비 본점', '서울시 강북구', 15, 'manual') RETURNING id INTO v_stop_in_3;

  INSERT INTO public.shuttle_stops (center_id, route_id, sequence, name, address, est_minutes_from_start, est_source)
  VALUES (cid, v_route_out_id, 1, '플랜비 본점', '서울시 강북구', 0, 'manual') RETURNING id INTO v_stop_out_1;
  INSERT INTO public.shuttle_stops (center_id, route_id, sequence, name, address, est_minutes_from_start, est_source)
  VALUES (cid, v_route_out_id, 2, '도서관 사거리', '서울시 강북구', 8, 'fallback') RETURNING id INTO v_stop_out_2;
  INSERT INTO public.shuttle_stops (center_id, route_id, sequence, name, address, est_minutes_from_start, est_source)
  VALUES (cid, v_route_out_id, 3, '북부역', '서울시 강북구', 15, 'fallback') RETURNING id INTO v_stop_out_3;

  INSERT INTO public.shuttle_vehicles (center_id, name, plate, capacity, status)
  VALUES (cid, '1호차', '12가3456', 15, '운영') RETURNING id INTO v_vehicle_a;
  INSERT INTO public.shuttle_vehicles (center_id, name, plate, capacity, status)
  VALUES (cid, '2호차', '78나9012', 15, '운영') RETURNING id INTO v_vehicle_b;

  -- 운행 일정: 평일 등교 16:30 / 하교 18:40
  INSERT INTO public.shuttle_runs (center_id, route_id, vehicle_id, weekday, start_time, end_time, status)
  SELECT cid, v_route_in_id,  v_vehicle_a, w, '16:30', '17:00', '운영' FROM generate_series(1,5) w;
  INSERT INTO public.shuttle_runs (center_id, route_id, vehicle_id, weekday, start_time, end_time, status)
  SELECT cid, v_route_out_id, v_vehicle_b, w, '18:40', '19:10', '운영' FROM generate_series(1,5) w;

  -- 6. 학생 100명 생성 + 후속 데이터
  FOR i IN 1..100 LOOP
    -- 학생 status 분배: 1~70 정상 / 71~85 휴원 / 86~95 상담중 / 96~100 탈퇴
    v_status := CASE
      WHEN i <= 70 THEN '정상'
      WHEN i <= 85 THEN '휴원'
      WHEN i <= 95 THEN '상담중'
      ELSE '탈퇴'
    END;

    v_name := v_surnames[((i - 1) % 20) + 1] || v_givennames[((i - 1) % 30) + 1];
    v_school := v_schools[((i - 1) % 7) + 1];
    v_grade := (((i - 1) % 6) + 1)::text || '학년';
    v_birth := (date '2010-01-01' + (i * 73 % 2920))::date;  -- 2010~2017 분산
    v_gender := CASE WHEN i % 2 = 0 THEN '여' ELSE '남' END;

    -- 상품 배정 (정상·휴원만)
    v_prod_id := CASE
      WHEN v_status IN ('정상','휴원') THEN
        CASE (i % 4)
          WHEN 0 THEN v_prod_5
          WHEN 1 THEN v_prod_1
          WHEN 2 THEN v_prod_2
          ELSE v_prod_3
        END
      ELSE NULL
    END;
    v_prod_price := CASE
      WHEN v_prod_id = v_prod_1 THEN 80000
      WHEN v_prod_id = v_prod_2 THEN 150000
      WHEN v_prod_id = v_prod_3 THEN 200000
      WHEN v_prod_id = v_prod_5 THEN 300000
      ELSE 0
    END;

    -- 클래스 배정 (정상·휴원만)
    v_class_id := CASE
      WHEN v_status IN ('정상','휴원') THEN
        CASE (i % 3) WHEN 0 THEN v_class_c WHEN 1 THEN v_class_a ELSE v_class_b END
      ELSE NULL
    END;

    -- 참여 요일
    v_attendance_days := CASE
      WHEN v_class_id = v_class_a THEN '월,수,금'
      WHEN v_class_id = v_class_b THEN '화,목'
      WHEN v_class_id = v_class_c THEN '월,화,수,목,금'
      ELSE NULL
    END;

    -- 학생 INSERT
    INSERT INTO public.students
      (center_id, name, gender, birth, school, grade, sport, level, status,
       class_id, product_id, attendance_days,
       shuttle_use, parent1_name, parent1_phone)
    VALUES
      (cid, v_name, v_gender, v_birth, v_school, v_grade, '배드민턴',
       CASE WHEN v_class_id = v_class_c THEN '고급' WHEN v_class_id = v_class_b THEN '중급' ELSE '초급' END,
       v_status,
       v_class_id, v_prod_id, v_attendance_days,
       CASE WHEN i % 3 = 0 AND v_status IN ('정상','휴원') THEN '이용' ELSE '미이용' END,
       v_name || '_보호자', '010-' || lpad((1000 + i)::text, 4, '0') || '-' || lpad((2000 + i)::text, 4, '0'))
    RETURNING id INTO v_student_id;

    -- enrollment (정상·휴원만)
    IF v_status IN ('정상','휴원') THEN
      INSERT INTO public.enrollments
        (center_id, student_id, class_id, product_id, attendance_days,
         start_date, billing_start_month, status)
      VALUES
        (cid, v_student_id, v_class_id, v_prod_id, v_attendance_days,
         date '2026-03-01', '2026-03',
         CASE WHEN v_status = '휴원' THEN '종료' ELSE '수강중' END)
      RETURNING id INTO v_enrollment_id;

      -- 셔틀 배정 (i % 3 == 0 인 학생만, 휴원 시 자동 중지)
      IF i % 3 = 0 THEN
        INSERT INTO public.student_stop_assignments
          (center_id, student_id, route_id, board_stop_id, alight_stop_id, direction, status, weekdays)
        VALUES
          (cid, v_student_id, v_route_in_id, v_stop_in_1, NULL, '등교',
           CASE WHEN v_status = '휴원' THEN '중지' ELSE '활성' END,
           v_attendance_days);
        INSERT INTO public.student_stop_assignments
          (center_id, student_id, route_id, board_stop_id, alight_stop_id, direction, status, weekdays)
        VALUES
          (cid, v_student_id, v_route_out_id, NULL, v_stop_out_3, '하교',
           CASE WHEN v_status = '휴원' THEN '중지' ELSE '활성' END,
           v_attendance_days);
      END IF;

      -- 7. 월별 (3월/4월/5월) renewal_confirmations + invoices + payments + measurements
      FOR m IN 3..5 LOOP
        v_period := '2026-' || lpad(m::text, 2, '0');
        v_due := (v_period || '-10')::date;

        -- 휴원 학생은 5월 청구·측정 없음 (4월 말 휴원 처리 가정)
        IF v_status = '휴원' AND m = 5 THEN
          CONTINUE;
        END IF;

        -- renewal_confirmations (그 달 자체에 대한 확정 — 단순화: 그 달 분 청구의 confirm)
        INSERT INTO public.renewal_confirmations
          (center_id, enrollment_id, target_month, status, decided_by_role, decided_at)
        VALUES
          (cid, v_enrollment_id, v_period,
           CASE WHEN v_status = '휴원' AND m = 4 THEN '확정'
                WHEN i % 23 = 0 THEN '보류'
                ELSE '확정' END,
           'admin', (v_period || '-01')::timestamptz);

        -- invoices 상태 분배 (그 달별 분포)
        v_invoice_status := CASE m
          WHEN 3 THEN
            CASE WHEN i % 20 = 0 THEN '환불'
                 WHEN i % 10 = 0 THEN '청구'
                 ELSE '결제완료' END
          WHEN 4 THEN
            CASE WHEN i % 25 = 0 THEN '환불'
                 WHEN i % 20 = 0 THEN '실패'
                 WHEN i % 8 = 0 THEN '청구'
                 ELSE '결제완료' END
          WHEN 5 THEN
            CASE WHEN i % 30 = 0 THEN '환불'
                 WHEN i % 12 = 0 THEN '실패'
                 WHEN i % 5 = 0 THEN '청구'
                 ELSE '결제완료' END
        END;

        -- 결제 채널 분배
        v_pay_method := CASE (i % 5)
          WHEN 0 THEN 'offline_cash'
          WHEN 1 THEN 'offline_card'
          WHEN 2 THEN 'offline_transfer'
          WHEN 3 THEN 'parent_portal'
          ELSE 'pg_in_store'
        END;

        v_paid_at := CASE WHEN v_invoice_status IN ('결제완료','환불')
                          THEN (v_period || '-' || lpad((5 + (i % 15))::text, 2, '0'))::timestamptz
                          ELSE NULL END;

        INSERT INTO public.invoices
          (center_id, student_id, period, amount, status, source, due_date, issued_at, paid_at, payment_method)
        VALUES
          (cid, v_student_id, v_period, v_prod_price, v_invoice_status, '수강확인',
           v_due,
           (v_period || '-01')::timestamptz,
           v_paid_at,
           CASE WHEN v_invoice_status IN ('결제완료','환불') THEN v_pay_method ELSE NULL END)
        RETURNING id INTO v_invoice_id;

        INSERT INTO public.invoice_items
          (center_id, invoice_id, enrollment_id, label, amount)
        VALUES
          (cid, v_invoice_id, v_enrollment_id,
           CASE WHEN v_prod_id = v_prod_1 THEN '주1회 정규반'
                WHEN v_prod_id = v_prod_2 THEN '주2회 정규반'
                WHEN v_prod_id = v_prod_3 THEN '주3회 정규반'
                ELSE '주5회 집중반' END,
           v_prod_price);

        -- payments — 결제완료/환불 시
        IF v_invoice_status IN ('결제완료','환불') THEN
          INSERT INTO public.payments
            (center_id, invoice_id, amount, status, provider, method, card_name,
             card_number_masked, approval_no, paid_at)
          VALUES
            (cid, v_invoice_id, v_prod_price, '성공',
             CASE WHEN v_pay_method = 'pg_in_store' THEN 'portone' ELSE 'offline' END,
             CASE
               WHEN v_pay_method = 'offline_cash' THEN '현금'
               WHEN v_pay_method = 'offline_transfer' THEN '계좌이체'
               ELSE '카드'
             END,
             CASE WHEN v_pay_method IN ('offline_card','pg_in_store') THEN '신한카드' ELSE NULL END,
             CASE WHEN v_pay_method IN ('offline_card','pg_in_store') THEN '1234-****-****-5678' ELSE NULL END,
             CASE WHEN v_pay_method IN ('offline_card','pg_in_store') THEN lpad((10000000 + i * 73)::text, 8, '0') ELSE NULL END,
             v_paid_at);

          -- 환불 행 추가
          IF v_invoice_status = '환불' THEN
            INSERT INTO public.payments
              (center_id, invoice_id, amount, status, provider, paid_at, raw)
            VALUES
              (cid, v_invoice_id, v_prod_price, '환불',
               CASE WHEN v_pay_method = 'pg_in_store' THEN 'portone' ELSE 'offline' END,
               v_paid_at + interval '3 day',
               jsonb_build_object('refund_reason', '테스트 환불'));
          END IF;
        END IF;

        -- measurements (그 달 분포)
        v_meas_status := CASE m
          WHEN 3 THEN CASE WHEN i % 17 = 0 THEN '반려' WHEN i % 11 = 0 THEN '입력완료' ELSE '승인완료' END
          WHEN 4 THEN CASE WHEN i % 19 = 0 THEN '반려' WHEN i % 7 = 0 THEN '입력완료' ELSE '승인완료' END
          WHEN 5 THEN CASE
                        WHEN i % 4 = 0 THEN '대기'
                        WHEN i % 4 = 1 THEN '입력완료'
                        WHEN i % 4 = 2 THEN '승인완료'
                        ELSE '반려' END
        END;

        -- 휴원 4월은 측정 X (이번달은 마지막)
        IF NOT (v_status = '휴원' AND m = 4) THEN
          INSERT INTO public.measurements
            (center_id, student_id, measurement_month, status, measured_at, reviewed_at, reject_reason)
          VALUES
            (cid, v_student_id, v_period, v_meas_status,
             CASE WHEN v_meas_status IN ('입력완료','승인완료','반려') THEN (v_period || '-15')::timestamptz ELSE NULL END,
             CASE WHEN v_meas_status IN ('승인완료','반려') THEN (v_period || '-20')::timestamptz ELSE NULL END,
             CASE WHEN v_meas_status = '반려' THEN '재측정 필요' ELSE NULL END)
          ON CONFLICT (student_id, measurement_month) DO NOTHING
          RETURNING id INTO v_meas_id;

          -- 측정값 채우기 (입력완료/승인완료/반려 시)
          IF v_meas_id IS NOT NULL AND v_meas_status IN ('입력완료','승인완료','반려') THEN
            INSERT INTO public.measurement_values (measurement_id, item_id, value_num)
            SELECT v_meas_id, mi.id,
                   round((100 + (i * 7 + mi.sort_order) % 80)::numeric, 1)
              FROM public.measurement_items mi
             WHERE mi.center_id = cid AND mi.active = true;
          END IF;

          -- reports (승인완료 측정만, 월별 분포)
          IF v_meas_status = '승인완료' THEN
            v_report_status := CASE m
              WHEN 3 THEN '발행완료'
              WHEN 4 THEN CASE WHEN i % 5 = 0 THEN '생성완료' ELSE '발행완료' END
              WHEN 5 THEN CASE WHEN i % 10 = 0 THEN '발행완료' ELSE '생성완료' END
            END;
            v_published_at := CASE WHEN v_report_status = '발행완료'
                                   THEN (v_period || '-25')::timestamptz ELSE NULL END;

            INSERT INTO public.reports
              (center_id, student_id, measurement_id, report_month, report_type,
               status, snapshot, coach_comment, admin_comment,
               public_to_parent, published_at)
            VALUES
              (cid, v_student_id, v_meas_id, v_period, '월간',
               v_report_status, jsonb_build_object('seed', true, 'period', v_period),
               '이번 달 컨디션 양호, 다음 달도 꾸준히 진행 부탁드립니다.',
               '체지방률 소폭 감소, 기초체력 항목 전반적으로 향상.',
               (v_report_status = '발행완료'),
               v_published_at)
            ON CONFLICT (student_id, report_month, report_type) DO NOTHING;
          END IF;
        END IF;
      END LOOP;
    END IF;
  END LOOP;

  -- 카드 정보 더미 보강 (결제완료 invoice 중 payment 없는 것)
  PERFORM public.seed_dummy_payments(cid);

  RAISE NOTICE '시드 완료 — 학생 100명 / 3개월(3-5월) 청구·결제·측정·리포트 분포';
END $$;

-- =====================================================================
--  실행 후 확인 쿼리
-- =====================================================================
-- 학생 수: 100 (정상 70 / 휴원 15 / 상담중 10 / 탈퇴 5)
SELECT status, COUNT(*) FROM public.students
 WHERE center_id = (SELECT id FROM public.centers WHERE name='플랜비 본점') GROUP BY status;

-- 청구서 분포 월별 × 상태별
SELECT period, status, COUNT(*) FROM public.invoices
 WHERE center_id = (SELECT id FROM public.centers WHERE name='플랜비 본점')
 GROUP BY period, status ORDER BY period, status;

-- 측정 분포 월별 × 상태별
SELECT measurement_month, status, COUNT(*) FROM public.measurements
 WHERE center_id = (SELECT id FROM public.centers WHERE name='플랜비 본점')
 GROUP BY measurement_month, status ORDER BY measurement_month, status;

-- 리포트 분포 월별 × 상태별
SELECT report_month, status, COUNT(*) FROM public.reports
 WHERE center_id = (SELECT id FROM public.centers WHERE name='플랜비 본점')
 GROUP BY report_month, status ORDER BY report_month, status;

-- 결제 채널 분포
SELECT payment_method, COUNT(*) FROM public.invoices
 WHERE center_id = (SELECT id FROM public.centers WHERE name='플랜비 본점')
   AND payment_method IS NOT NULL
 GROUP BY payment_method;
