
-- Add platform-specific follower columns and rankit_score to creators
ALTER TABLE public.creators 
ADD COLUMN youtube_subscribers integer NOT NULL DEFAULT 0,
ADD COLUMN chzzk_followers integer NOT NULL DEFAULT 0,
ADD COLUMN instagram_followers integer NOT NULL DEFAULT 0,
ADD COLUMN tiktok_followers integer NOT NULL DEFAULT 0,
ADD COLUMN rankit_score numeric NOT NULL DEFAULT 0;

-- Copy existing subscriber_count to youtube_subscribers as initial data
UPDATE public.creators SET youtube_subscribers = subscriber_count;

-- Update recalculate_ranks to use the new weighted system
CREATE OR REPLACE FUNCTION public.recalculate_ranks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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
  WHERE c.id = r.id;
  RETURN NULL;
END;
$function$;
