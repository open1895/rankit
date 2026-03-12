
-- Add category and winner_id columns to battles table
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '';
ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS winner_id uuid REFERENCES public.creators(id);

-- Update batch_recalculate_ranks to use new formula:
-- 40% followers + 40% votes + 20% battle win rate
CREATE OR REPLACE FUNCTION public.batch_recalculate_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH follower_scores AS (
    SELECT 
      id,
      (youtube_subscribers * 1.5) + 
      (chzzk_followers * 2.0) + 
      (instagram_followers * 1.2) + 
      (tiktok_followers * 0.8) as raw_follower_score,
      votes_count
    FROM public.creators
  ),
  max_values AS (
    SELECT 
      GREATEST(MAX(raw_follower_score), 1) as max_follower,
      GREATEST(MAX(votes_count), 1) as max_votes
    FROM follower_scores
  ),
  battle_stats AS (
    SELECT 
      c.id as creator_id,
      COUNT(b.id) as total_battles,
      COUNT(b.id) FILTER (WHERE b.winner_id = c.id) as wins
    FROM public.creators c
    LEFT JOIN public.battles b ON (
      (b.creator_a_id = c.id OR b.creator_b_id = c.id)
      AND b.status = 'completed'
      AND b.winner_id IS NOT NULL
    )
    GROUP BY c.id
  ),
  scored AS (
    SELECT 
      fs.id,
      (
        -- 40% followers (normalized to 0-100)
        (fs.raw_follower_score / mv.max_follower) * 40.0 +
        -- 40% votes (normalized to 0-100)
        (fs.votes_count::numeric / mv.max_votes) * 40.0 +
        -- 20% battle win rate (0-100)
        CASE 
          WHEN bs.total_battles >= 1 THEN (bs.wins::numeric / bs.total_battles) * 20.0
          ELSE 0
        END
      ) as calculated_score
    FROM follower_scores fs
    CROSS JOIN max_values mv
    LEFT JOIN battle_stats bs ON bs.creator_id = fs.id
  ),
  ranked AS (
    SELECT id, calculated_score, 
      ROW_NUMBER() OVER (ORDER BY calculated_score DESC, id ASC) as new_rank
    FROM scored
  )
  UPDATE public.creators c
  SET rank = r.new_rank, rankit_score = r.calculated_score
  FROM ranked r
  WHERE c.id = r.id
    AND (c.rank IS DISTINCT FROM r.new_rank OR c.rankit_score IS DISTINCT FROM r.calculated_score);
END;
$$;
