
-- Drop the existing recalculate_ranks trigger on creators (causes deadlocks on concurrent votes)
DROP TRIGGER IF EXISTS trigger_recalculate_ranks ON public.creators;

-- Enable pg_cron and pg_net for async batch processing
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA pg_catalog;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Create a wrapper function for cron to call
CREATE OR REPLACE FUNCTION public.batch_recalculate_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH scored AS (
    SELECT 
      id,
      (youtube_subscribers * 1.5) + 
      (chzzk_followers * 2.0) + 
      (instagram_followers * 1.2) + 
      (tiktok_followers * 0.8) as calculated_score
    FROM public.creators
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
