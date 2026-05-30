-- =====================================================================
--  plab01 — get_student_detail RPC
--  학생 상세 데이터를 1 RPC 호출로 반환 (SECURITY DEFINER → RLS 우회).
--  실행: Supabase Dashboard > SQL Editor > 전체 복사 > Run
--  멱등 (CREATE OR REPLACE) — 여러 번 실행 안전.
--  효과: nested RLS 평가 ~5번 → 함수 내부 권한 검증 1번 → 응답 ~600ms → ~150-250ms
-- =====================================================================

CREATE OR REPLACE FUNCTION public.get_student_detail(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cid uuid;
  v_role text;
  v_is_super boolean;
  v_student jsonb;
  v_class jsonb;
  v_linked jsonb;
  v_invoice_status text;
  v_period text := to_char(current_date, 'YYYY-MM');
BEGIN
  -- 호출자 권한 검증 (admin / super_admin / coach 만 허용)
  SELECT center_id, role::text INTO v_cid, v_role
    FROM public.users
    WHERE id = auth.uid();

  IF v_role IS NULL OR v_role NOT IN ('admin', 'super_admin', 'coach') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  v_is_super := (v_role = 'super_admin');

  -- 학생 정보 (super_admin 은 모든 센터, 나머지는 자기 센터만)
  SELECT to_jsonb(s.*) INTO v_student
    FROM public.students s
    WHERE s.id = p_id
      AND (v_is_super OR s.center_id = v_cid);

  IF v_student IS NULL THEN
    RAISE EXCEPTION 'student not found';
  END IF;

  -- 학생의 클래스 정보 (nested)
  SELECT jsonb_build_object(
    'name', c.name,
    'start_time', c.start_time,
    'end_time', c.end_time,
    'days_of_week', c.days_of_week
  ) INTO v_class
    FROM public.classes c
    WHERE c.id = (v_student->>'class_id')::uuid;

  IF v_class IS NOT NULL THEN
    v_student := v_student || jsonb_build_object('classes', v_class);
  END IF;

  -- 연결된 학부모 계정
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'status', psl.status,
    'parent', jsonb_build_object(
      'id', u.id,
      'name', u.name,
      'email', u.email,
      'phone', u.phone
    )
  )), '[]'::jsonb) INTO v_linked
    FROM public.parent_student_links psl
    JOIN public.users u ON u.id = psl.parent_id
    WHERE psl.student_id = p_id;

  -- 이번달 invoice 가장 최근 status
  SELECT i.status INTO v_invoice_status
    FROM public.invoices i
    WHERE i.student_id = p_id AND i.period = v_period
    ORDER BY i.created_at DESC
    LIMIT 1;

  RETURN jsonb_build_object(
    'student', v_student,
    'linkedParents', v_linked,
    'currentInvoiceStatus', v_invoice_status
  );
END $$;

-- authenticated 사용자만 호출 가능 (anon 차단)
REVOKE ALL ON FUNCTION public.get_student_detail(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_student_detail(uuid) TO authenticated;

-- =====================================================================
--  실행 후 확인 — 함수 존재 확인
-- =====================================================================
SELECT
  proname,
  pronargs,
  prorettype::regtype,
  prosecdef AS "security_definer"
FROM pg_proc
WHERE proname = 'get_student_detail';
