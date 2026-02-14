
-- Create rank history table for tracking rank changes over time
CREATE TABLE public.rank_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  rank integer NOT NULL,
  votes_count integer NOT NULL,
  recorded_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.rank_history ENABLE ROW LEVEL SECURITY;

-- Public read access
CREATE POLICY "Anyone can view rank history"
ON public.rank_history FOR SELECT
USING (true);

-- Only system can insert (via trigger)
CREATE POLICY "No direct insert on rank_history"
ON public.rank_history FOR INSERT
WITH CHECK (false);

-- Index for efficient queries
CREATE INDEX idx_rank_history_creator ON public.rank_history(creator_id, recorded_at DESC);

-- Trigger to record rank history on every rank change
CREATE OR REPLACE FUNCTION public.record_rank_history()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.rank IS DISTINCT FROM NEW.rank OR OLD.votes_count IS DISTINCT FROM NEW.votes_count THEN
    INSERT INTO public.rank_history (creator_id, rank, votes_count)
    VALUES (NEW.id, NEW.rank, NEW.votes_count);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_creator_rank_change
AFTER UPDATE ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.record_rank_history();

-- Enable realtime for rank_history
ALTER PUBLICATION supabase_realtime ADD TABLE public.rank_history;
