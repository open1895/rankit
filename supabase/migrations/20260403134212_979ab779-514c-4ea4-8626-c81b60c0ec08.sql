
-- Add new columns to tournaments
ALTER TABLE public.tournaments 
ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS season_number integer NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_round text NOT NULL DEFAULT 'quarterfinal',
ADD COLUMN IF NOT EXISTS champion_creator_id uuid REFERENCES public.creators(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS start_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS end_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'draft';

-- Migrate existing data: is_active=true -> status='active', ended_at not null -> 'ended'
UPDATE public.tournaments SET status = 'active' WHERE is_active = true AND ended_at IS NULL;
UPDATE public.tournaments SET status = 'ended' WHERE ended_at IS NOT NULL;

-- Add status column to tournament_matches
ALTER TABLE public.tournament_matches
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active',
ADD COLUMN IF NOT EXISTS start_at timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS end_at timestamp with time zone;

-- Migrate existing match data
UPDATE public.tournament_matches SET status = 'completed' WHERE is_completed = true;

-- Create tournament_participants table
CREATE TABLE IF NOT EXISTS public.tournament_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  seed integer NOT NULL DEFAULT 0,
  selection_score numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tournament_id, creator_id)
);

ALTER TABLE public.tournament_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament participants"
ON public.tournament_participants FOR SELECT USING (true);

CREATE POLICY "No direct insert on tournament_participants"
ON public.tournament_participants FOR INSERT WITH CHECK (false);

CREATE POLICY "No update on tournament_participants"
ON public.tournament_participants FOR UPDATE USING (false);

CREATE POLICY "No delete on tournament_participants"
ON public.tournament_participants FOR DELETE USING (false);

-- Create tournament_logs table
CREATE TABLE IF NOT EXISTS public.tournament_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  log_type text NOT NULL DEFAULT 'info',
  message text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournament logs"
ON public.tournament_logs FOR SELECT USING (true);

CREATE POLICY "No direct insert on tournament_logs"
ON public.tournament_logs FOR INSERT WITH CHECK (false);

CREATE POLICY "No update on tournament_logs"
ON public.tournament_logs FOR UPDATE USING (false);

CREATE POLICY "No delete on tournament_logs"
ON public.tournament_logs FOR DELETE USING (false);
