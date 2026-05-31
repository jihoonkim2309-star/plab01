-- =====================================================================
--  plab01 — 측정 항목 연령·성별 기준값 테이블
--  실행: Supabase Dashboard > SQL Editor > 전체 복사 > Run
--  멱등 (CREATE TABLE IF NOT EXISTS) — 여러 번 실행 안전.
--
--  운영 모델:
--    학원이 직접 입력한 연령대(초저/초고/중등) + 성별별 min/max 기준값.
--    snapshot 생성 시 이 기준값으로 0-100 점 정규화 (추후 적용).
--
--  연령대 (age_band):
--    '초저'  — 7~9세 (초1~3)
--    '초고'  — 10~12세 (초4~6)
--    '중등'  — 13~16세 (중1~3 + 일부 고1)
--
--  값 의미:
--    HIGHER_BETTER 항목 → min/max 가 0점/100점 기준 (높을수록 좋음)
--    LOWER_BETTER 항목 → min/max 가 100점/0점 기준 (낮을수록 좋음, '좋은' 값이 min)
-- =====================================================================

CREATE TABLE IF NOT EXISTS public.measurement_norms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  center_id   uuid NOT NULL REFERENCES public.centers(id) ON DELETE CASCADE,
  item_id     uuid NOT NULL REFERENCES public.measurement_items(id) ON DELETE CASCADE,
  age_band    text NOT NULL CHECK (age_band IN ('초저', '초고', '중등')),
  gender      text NOT NULL CHECK (gender IN ('남', '여')),
  min_value   numeric,
  max_value   numeric,
  avg_value   numeric,
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (center_id, item_id, age_band, gender)
);

CREATE INDEX IF NOT EXISTS measurement_norms_center_item_idx
  ON public.measurement_norms (center_id, item_id);

-- RLS
ALTER TABLE public.measurement_norms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS measurement_norms_admin_all ON public.measurement_norms;
CREATE POLICY measurement_norms_admin_all ON public.measurement_norms
  FOR ALL
  USING (public.is_center_admin(center_id))
  WITH CHECK (public.is_center_admin(center_id));

-- 갱신 시 updated_at 자동
DROP TRIGGER IF EXISTS measurement_norms_touch ON public.measurement_norms;
CREATE TRIGGER measurement_norms_touch BEFORE UPDATE ON public.measurement_norms
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 확인
SELECT 'measurement_norms 생성 완료' AS msg;
