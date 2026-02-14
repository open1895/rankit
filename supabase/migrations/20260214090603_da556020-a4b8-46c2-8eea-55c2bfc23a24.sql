
-- Add subscriber_count column to creators table
ALTER TABLE public.creators ADD COLUMN subscriber_count integer NOT NULL DEFAULT 0;

-- Create influence_score computed function for ranking
-- Formula: subscribers 40% + votes 40% + community activity 20%
-- We normalize each component relative to the max in its category
CREATE OR REPLACE FUNCTION public.recalculate_ranks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH activity_scores AS (
    SELECT 
      c.id,
      c.subscriber_count,
      c.votes_count,
      COALESCE(act.activity, 0) as activity_score
    FROM public.creators c
    LEFT JOIN (
      SELECT creator_id, COUNT(*) as activity
      FROM public.comments
      GROUP BY creator_id
    ) act ON act.creator_id = c.id
  ),
  max_values AS (
    SELECT 
      GREATEST(MAX(subscriber_count), 1) as max_subs,
      GREATEST(MAX(votes_count), 1) as max_votes,
      GREATEST(MAX(activity_score), 1) as max_activity
    FROM activity_scores
  ),
  influence AS (
    SELECT 
      a.id,
      (a.subscriber_count::float / m.max_subs) * 0.4 +
      (a.votes_count::float / m.max_votes) * 0.4 +
      (a.activity_score::float / m.max_activity) * 0.2 as score
    FROM activity_scores a, max_values m
  ),
  ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, id ASC) as new_rank
    FROM influence
  )
  UPDATE public.creators c
  SET rank = r.new_rank
  FROM ranked r
  WHERE c.id = r.id;
  RETURN NULL;
END;
$$;

-- Also allow updating creators (for manual subscriber_count edits)
CREATE POLICY "Allow update subscriber_count"
ON public.creators
FOR UPDATE
USING (true)
WITH CHECK (true);
