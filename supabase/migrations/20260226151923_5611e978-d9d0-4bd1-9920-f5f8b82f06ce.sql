
-- Function to get daily vote counts for a creator (last 7 days)
CREATE OR REPLACE FUNCTION public.get_creator_daily_votes(p_creator_id uuid, p_days integer DEFAULT 7)
RETURNS TABLE (vote_date date, vote_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    (created_at AT TIME ZONE 'Asia/Seoul')::date as vote_date,
    COUNT(*) as vote_count
  FROM public.votes
  WHERE creator_id = p_creator_id
    AND created_at >= (now() - (p_days || ' days')::interval)
  GROUP BY vote_date
  ORDER BY vote_date ASC;
$$;

-- Function to get hourly vote distribution for a creator (last 7 days)
CREATE OR REPLACE FUNCTION public.get_creator_hourly_votes(p_creator_id uuid)
RETURNS TABLE (vote_hour integer, vote_count bigint, today_count bigint, yesterday_count bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    EXTRACT(HOUR FROM created_at AT TIME ZONE 'Asia/Seoul')::integer as vote_hour,
    COUNT(*) as vote_count,
    COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = (now() AT TIME ZONE 'Asia/Seoul')::date) as today_count,
    COUNT(*) FILTER (WHERE (created_at AT TIME ZONE 'Asia/Seoul')::date = ((now() AT TIME ZONE 'Asia/Seoul') - interval '1 day')::date) as yesterday_count
  FROM public.votes
  WHERE creator_id = p_creator_id
    AND created_at >= (now() - interval '7 days')
  GROUP BY vote_hour
  ORDER BY vote_hour ASC;
$$;
