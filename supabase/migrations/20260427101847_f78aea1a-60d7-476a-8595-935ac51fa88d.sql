CREATE OR REPLACE FUNCTION public.get_public_home_stats()
RETURNS TABLE (
  creator_count integer,
  total_votes integer,
  fan_count integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*)::integer FROM public.creators) AS creator_count,
    (SELECT COALESCE(SUM(votes_count), 0)::integer FROM public.creators) AS total_votes,
    GREATEST(
      (SELECT COUNT(*)::integer FROM public.profiles),
      (SELECT COUNT(DISTINCT user_id)::integer FROM public.votes WHERE user_id IS NOT NULL)
    ) AS fan_count;
$$;

REVOKE ALL ON FUNCTION public.get_public_home_stats() FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_home_stats() TO anon, authenticated;