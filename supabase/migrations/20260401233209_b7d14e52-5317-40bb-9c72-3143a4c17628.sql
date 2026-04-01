
-- Boost usage tracking table
CREATE TABLE public.boost_usages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  multiplier INTEGER NOT NULL DEFAULT 5,
  rp_cost INTEGER NOT NULL,
  votes_added INTEGER NOT NULL,
  context TEXT NOT NULL DEFAULT 'ranking',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boost_usages ENABLE ROW LEVEL SECURITY;

-- Users can view own boost history
CREATE POLICY "Users can view own boost usages"
ON public.boost_usages FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No direct insert (server only)
CREATE POLICY "No direct insert on boost_usages"
ON public.boost_usages FOR INSERT
WITH CHECK (false);

-- No update
CREATE POLICY "No update on boost_usages"
ON public.boost_usages FOR UPDATE
USING (false);

-- No delete
CREATE POLICY "No delete on boost_usages"
ON public.boost_usages FOR DELETE
USING (false);

-- Index for daily limit check
CREATE INDEX idx_boost_usages_user_daily ON public.boost_usages (user_id, created_at);
