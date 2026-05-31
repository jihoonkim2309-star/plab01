-- 리포트 학부모 열람 트래킹.
-- 학부모 포털·앱에서 리포트 PDF 열 때 update 호출.
-- parent_viewed_at: 최초 열람 시각 (NULL = 미열람)
-- parent_view_count: 누적 열람 횟수

ALTER TABLE public.reports
  ADD COLUMN IF NOT EXISTS parent_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS parent_view_count int NOT NULL DEFAULT 0;

-- 학부모 열람 기록용 RPC (학부모 앱에서 호출 — RLS 우회).
-- 발행완료 + public_to_parent + 본인 자녀 리포트만 카운트 증가.
CREATE OR REPLACE FUNCTION public.record_report_view(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_student uuid;
  v_status text;
  v_public bool;
  v_parent uuid := auth.uid();
  v_linked bool;
BEGIN
  IF v_parent IS NULL THEN
    RAISE EXCEPTION '로그인 필요';
  END IF;

  SELECT student_id, status, public_to_parent
    INTO v_student, v_status, v_public
  FROM reports
  WHERE id = p_report_id;

  IF v_student IS NULL THEN RETURN; END IF;
  IF v_status <> '발행완료' OR NOT v_public THEN RETURN; END IF;

  -- 학부모-학생 연결 확인
  SELECT EXISTS (
    SELECT 1 FROM parent_student_links
    WHERE parent_id = v_parent AND student_id = v_student AND status = 'linked'
  ) INTO v_linked;
  IF NOT v_linked THEN RETURN; END IF;

  UPDATE reports
    SET parent_viewed_at = COALESCE(parent_viewed_at, now()),
        parent_view_count = parent_view_count + 1
    WHERE id = p_report_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_report_view(uuid) TO authenticated;
