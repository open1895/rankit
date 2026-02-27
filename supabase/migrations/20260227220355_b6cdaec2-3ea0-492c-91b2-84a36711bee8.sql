
-- Create creator_rewards table
CREATE TABLE public.creator_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  threshold_votes INTEGER NOT NULL DEFAULT 100,
  reward_type TEXT NOT NULL DEFAULT 'message',
  media_url TEXT NOT NULL DEFAULT '',
  thanks_message TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  display_order INTEGER NOT NULL DEFAULT 0
);

-- Enable RLS
ALTER TABLE public.creator_rewards ENABLE ROW LEVEL SECURITY;

-- Anyone can view rewards (public feature)
CREATE POLICY "Anyone can view creator rewards"
  ON public.creator_rewards FOR SELECT
  USING (true);

-- Creator owner can manage their rewards
CREATE POLICY "Creator owner can insert rewards"
  ON public.creator_rewards FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = creator_rewards.creator_id
        AND creators.user_id = auth.uid()
    )
    AND threshold_votes >= 1
    AND char_length(thanks_message) <= 500
    AND char_length(media_url) <= 1000
  );

CREATE POLICY "Creator owner can update rewards"
  ON public.creator_rewards FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = creator_rewards.creator_id
        AND creators.user_id = auth.uid()
    )
  );

CREATE POLICY "Creator owner can delete rewards"
  ON public.creator_rewards FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = creator_rewards.creator_id
        AND creators.user_id = auth.uid()
    )
  );

-- Create index for fast lookups
CREATE INDEX idx_creator_rewards_creator_id ON public.creator_rewards(creator_id);
