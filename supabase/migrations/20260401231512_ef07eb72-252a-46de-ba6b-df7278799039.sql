
-- Creator RP rewards log
CREATE TABLE public.creator_rp_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  reward_type TEXT NOT NULL DEFAULT '',
  reward_key TEXT NOT NULL DEFAULT '',
  rp_amount INTEGER NOT NULL DEFAULT 0,
  season_number INTEGER,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Unique constraint to prevent duplicate payouts
CREATE UNIQUE INDEX idx_creator_rp_rewards_unique ON public.creator_rp_rewards(creator_id, reward_key);

ALTER TABLE public.creator_rp_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view creator rp rewards"
  ON public.creator_rp_rewards FOR SELECT
  USING (true);

CREATE POLICY "No direct insert on creator_rp_rewards"
  ON public.creator_rp_rewards FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No update on creator_rp_rewards"
  ON public.creator_rp_rewards FOR UPDATE
  USING (false);

CREATE POLICY "No delete on creator_rp_rewards"
  ON public.creator_rp_rewards FOR DELETE
  USING (false);

-- Add performance tier and featured_until to creators
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS performance_tier TEXT NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMP WITH TIME ZONE;
