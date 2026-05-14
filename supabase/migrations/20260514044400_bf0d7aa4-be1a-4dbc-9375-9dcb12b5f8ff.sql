-- YouTube 채널 헬스 검증 결과 저장
CREATE TABLE IF NOT EXISTS public.creator_youtube_health (
  creator_id uuid PRIMARY KEY REFERENCES public.creators(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'unknown', -- 'ok' | 'channel_not_found' | 'handle_not_found' | 'fake_id' | 'no_channel_info' | 'api_error' | 'unknown'
  reason text,
  http_status integer,
  checked_at timestamptz NOT NULL DEFAULT now(),
  consecutive_failures integer NOT NULL DEFAULT 0,
  last_ok_at timestamptz,
  notified_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_cyh_status ON public.creator_youtube_health(status);
CREATE INDEX IF NOT EXISTS idx_cyh_checked_at ON public.creator_youtube_health(checked_at);

ALTER TABLE public.creator_youtube_health ENABLE ROW LEVEL SECURITY;

-- 관리자만 조회/수정
DROP POLICY IF EXISTS "Admins can view youtube health" ON public.creator_youtube_health;
CREATE POLICY "Admins can view youtube health"
  ON public.creator_youtube_health
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

DROP POLICY IF EXISTS "Admins can manage youtube health" ON public.creator_youtube_health;
CREATE POLICY "Admins can manage youtube health"
  ON public.creator_youtube_health
  FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 문제 크리에이터 요약 RPC (관리자 전용)
CREATE OR REPLACE FUNCTION public.get_unhealthy_youtube_creators()
RETURNS TABLE (
  creator_id uuid,
  name text,
  channel_link text,
  youtube_channel_id text,
  status text,
  reason text,
  http_status integer,
  consecutive_failures integer,
  checked_at timestamptz,
  last_ok_at timestamptz
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    c.id,
    c.name,
    c.channel_link,
    c.youtube_channel_id,
    h.status,
    h.reason,
    h.http_status,
    h.consecutive_failures,
    h.checked_at,
    h.last_ok_at
  FROM public.creator_youtube_health h
  JOIN public.creators c ON c.id = h.creator_id
  WHERE h.status <> 'ok'
    AND public.has_role(auth.uid(), 'admin')
  ORDER BY h.consecutive_failures DESC NULLS LAST, h.checked_at DESC;
$$;