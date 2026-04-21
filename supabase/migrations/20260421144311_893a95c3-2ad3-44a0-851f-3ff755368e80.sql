-- 월간 시즌 사이클 적용
-- 1) 기존 시즌 1 종료 처리 (이미 종료일 경과)
UPDATE public.seasons
SET is_active = false
WHERE is_active = true AND ended_at < now();

-- 2) 현재 월(KST 기준) 시즌이 없으면 자동 생성하는 헬퍼 함수
CREATE OR REPLACE FUNCTION public.ensure_current_monthly_season()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_season_id uuid;
  v_start timestamptz;
  v_end timestamptz;
  v_year int;
  v_month int;
  v_next_number int;
  v_title text;
BEGIN
  -- KST 기준 이번 달 1일 00:00 ~ 다음 달 1일 00:00
  v_start := date_trunc('month', (now() AT TIME ZONE 'Asia/Seoul'))::timestamp AT TIME ZONE 'Asia/Seoul';
  v_end := (date_trunc('month', (now() AT TIME ZONE 'Asia/Seoul')) + interval '1 month')::timestamp AT TIME ZONE 'Asia/Seoul';

  -- 이미 현재 월 시즌이 있으면 활성화하고 반환
  SELECT id INTO v_season_id
  FROM public.seasons
  WHERE started_at = v_start AND ended_at = v_end
  LIMIT 1;

  IF v_season_id IS NOT NULL THEN
    UPDATE public.seasons SET is_active = true WHERE id = v_season_id;
    -- 다른 시즌은 비활성화
    UPDATE public.seasons SET is_active = false WHERE id <> v_season_id AND is_active = true;
    RETURN v_season_id;
  END IF;

  -- 다음 시즌 번호
  SELECT COALESCE(MAX(season_number), 0) + 1 INTO v_next_number FROM public.seasons;

  v_year := EXTRACT(YEAR FROM (now() AT TIME ZONE 'Asia/Seoul'))::int;
  v_month := EXTRACT(MONTH FROM (now() AT TIME ZONE 'Asia/Seoul'))::int;
  v_title := v_year || '년 ' || v_month || '월 시즌';

  -- 다른 활성 시즌 비활성화
  UPDATE public.seasons SET is_active = false WHERE is_active = true;

  INSERT INTO public.seasons (season_number, title, started_at, ended_at, is_active)
  VALUES (v_next_number, v_title, v_start, v_end, true)
  RETURNING id INTO v_season_id;

  RETURN v_season_id;
END;
$$;

-- 3) 현재 월 시즌 즉시 생성/활성화
SELECT public.ensure_current_monthly_season();