
CREATE OR REPLACE FUNCTION public.get_prediction_leaderboard(p_month_offset integer DEFAULT 0)
RETURNS TABLE(
  user_id uuid,
  display_name text,
  avatar_url text,
  total_bets bigint,
  wins bigint,
  total_reward bigint,
  hit_rate numeric
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT
    pb.user_id,
    COALESCE(p.display_name, '익명') as display_name,
    COALESCE(p.avatar_url, '') as avatar_url,
    COUNT(*) as total_bets,
    COUNT(*) FILTER (WHERE pb.is_winner = true) as wins,
    COALESCE(SUM(pb.reward_amount) FILTER (WHERE pb.is_winner = true), 0)::bigint as total_reward,
    ROUND(
      COUNT(*) FILTER (WHERE pb.is_winner = true)::numeric / NULLIF(COUNT(*), 0) * 100,
      1
    ) as hit_rate
  FROM prediction_bets pb
  LEFT JOIN profiles p ON p.user_id = pb.user_id
  WHERE pb.is_winner IS NOT NULL
    AND pb.created_at >= date_trunc('month', now()) - (p_month_offset || ' months')::interval
    AND pb.created_at < date_trunc('month', now()) - ((p_month_offset - 1) || ' months')::interval
  GROUP BY pb.user_id, p.display_name, p.avatar_url
  HAVING COUNT(*) >= 3
  ORDER BY hit_rate DESC, wins DESC, total_reward DESC
  LIMIT 10;
$$;
