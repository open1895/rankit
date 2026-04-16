
-- Create daily_matchups table
CREATE TABLE public.daily_matchups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_a_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  creator_b_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  date DATE NOT NULL UNIQUE,
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_daily_matchups_date ON public.daily_matchups(date DESC);

-- Enable RLS
ALTER TABLE public.daily_matchups ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Anyone can view daily matchups"
ON public.daily_matchups
FOR SELECT
USING (true);

CREATE POLICY "No direct insert on daily_matchups"
ON public.daily_matchups
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update on daily_matchups"
ON public.daily_matchups
FOR UPDATE
USING (false);

CREATE POLICY "No delete on daily_matchups"
ON public.daily_matchups
FOR DELETE
USING (false);

-- Track which daily matchup users voted on (to show "already voted")
CREATE TABLE public.daily_matchup_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  matchup_id UUID NOT NULL REFERENCES public.daily_matchups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  voted_creator_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (matchup_id, user_id)
);

CREATE INDEX idx_daily_matchup_votes_user ON public.daily_matchup_votes(user_id, matchup_id);

ALTER TABLE public.daily_matchup_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own matchup votes"
ON public.daily_matchup_votes
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "No direct insert on daily_matchup_votes"
ON public.daily_matchup_votes
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No update on daily_matchup_votes"
ON public.daily_matchup_votes
FOR UPDATE
USING (false);

CREATE POLICY "No delete on daily_matchup_votes"
ON public.daily_matchup_votes
FOR DELETE
USING (false);

-- Daily summary tracker (so user can dismiss the card per-day)
CREATE TABLE public.daily_summary_dismissals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  summary_date DATE NOT NULL,
  dismissed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, summary_date)
);

ALTER TABLE public.daily_summary_dismissals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own dismissals"
ON public.daily_summary_dismissals
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own dismissals"
ON public.daily_summary_dismissals
FOR INSERT
WITH CHECK (auth.uid() = user_id);
