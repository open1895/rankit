
-- Create user_missions table for tracking mission completion
CREATE TABLE public.user_missions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  mission_key text NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  reward_amount integer NOT NULL DEFAULT 0,
  UNIQUE(user_id, mission_key)
);

-- Enable RLS
ALTER TABLE public.user_missions ENABLE ROW LEVEL SECURITY;

-- Users can view own missions
CREATE POLICY "Users can view own missions"
  ON public.user_missions FOR SELECT
  USING (auth.uid() = user_id);

-- No direct insert (handled by edge function)
CREATE POLICY "No direct insert on user_missions"
  ON public.user_missions FOR INSERT
  WITH CHECK (false);

-- No update/delete
CREATE POLICY "No update on user_missions"
  ON public.user_missions FOR UPDATE
  USING (false);

CREATE POLICY "No delete on user_missions"
  ON public.user_missions FOR DELETE
  USING (false);
