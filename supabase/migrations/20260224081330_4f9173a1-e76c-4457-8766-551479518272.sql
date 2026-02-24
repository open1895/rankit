
-- Prediction events: admin-created questions for users to bet on
CREATE TABLE public.prediction_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  creator_a_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  creator_b_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'resolved')),
  winner_id UUID REFERENCES public.creators(id),
  bet_deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  total_pool INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prediction_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view prediction events"
  ON public.prediction_events FOR SELECT USING (true);

CREATE POLICY "No direct insert on prediction_events"
  ON public.prediction_events FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update on prediction_events"
  ON public.prediction_events FOR UPDATE USING (false);

CREATE POLICY "No delete on prediction_events"
  ON public.prediction_events FOR DELETE USING (false);

-- User bets on prediction events
CREATE TABLE public.prediction_bets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_id UUID NOT NULL REFERENCES public.prediction_events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  predicted_creator_id UUID NOT NULL REFERENCES public.creators(id),
  amount INTEGER NOT NULL CHECK (amount >= 1 AND amount <= 10),
  is_winner BOOLEAN,
  reward_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(event_id, user_id)
);

ALTER TABLE public.prediction_bets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own bets"
  ON public.prediction_bets FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "No direct insert on prediction_bets"
  ON public.prediction_bets FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update on prediction_bets"
  ON public.prediction_bets FOR UPDATE USING (false);

CREATE POLICY "No delete on prediction_bets"
  ON public.prediction_bets FOR DELETE USING (false);

-- Also allow viewing aggregate bet counts (not individual user data)
CREATE POLICY "Anyone can view bet counts"
  ON public.prediction_bets FOR SELECT
  USING (true);

-- Indexes
CREATE INDEX idx_prediction_events_status ON public.prediction_events(status);
CREATE INDEX idx_prediction_bets_event ON public.prediction_bets(event_id);
CREATE INDEX idx_prediction_bets_user ON public.prediction_bets(user_id);
