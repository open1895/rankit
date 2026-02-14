
-- Fan Tournament tables
CREATE TABLE public.tournaments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  is_active BOOLEAN NOT NULL DEFAULT false,
  round INTEGER NOT NULL DEFAULT 16,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  ended_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tournaments" ON public.tournaments FOR SELECT USING (true);
CREATE POLICY "No insert on tournaments" ON public.tournaments FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on tournaments" ON public.tournaments FOR UPDATE USING (false);
CREATE POLICY "No delete on tournaments" ON public.tournaments FOR DELETE USING (false);

CREATE TABLE public.tournament_matches (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  round INTEGER NOT NULL DEFAULT 1,
  match_order INTEGER NOT NULL DEFAULT 0,
  creator_a_id UUID NOT NULL REFERENCES public.creators(id),
  creator_b_id UUID NOT NULL REFERENCES public.creators(id),
  votes_a INTEGER NOT NULL DEFAULT 0,
  votes_b INTEGER NOT NULL DEFAULT 0,
  winner_id UUID REFERENCES public.creators(id),
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.tournament_matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view matches" ON public.tournament_matches FOR SELECT USING (true);
CREATE POLICY "No direct insert on matches" ON public.tournament_matches FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on matches" ON public.tournament_matches FOR UPDATE USING (false);
CREATE POLICY "No delete on matches" ON public.tournament_matches FOR DELETE USING (false);

CREATE TABLE public.tournament_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.tournament_matches(id) ON DELETE CASCADE,
  voted_creator_id UUID NOT NULL REFERENCES public.creators(id),
  voter_ip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(match_id, voter_ip)
);

ALTER TABLE public.tournament_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct read on tournament_votes" ON public.tournament_votes FOR SELECT USING (false);
CREATE POLICY "No direct insert on tournament_votes" ON public.tournament_votes FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on tournament_votes" ON public.tournament_votes FOR UPDATE USING (false);
CREATE POLICY "No delete on tournament_votes" ON public.tournament_votes FOR DELETE USING (false);

-- Real-time Chat messages
CREATE TABLE public.chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  nickname TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view chat messages" ON public.chat_messages FOR SELECT USING (true);
CREATE POLICY "Anyone can insert chat messages" ON public.chat_messages
  FOR INSERT WITH CHECK (
    char_length(message) >= 1 AND char_length(message) <= 200
    AND char_length(nickname) >= 2 AND char_length(nickname) <= 20
  );
CREATE POLICY "No update on chat messages" ON public.chat_messages FOR UPDATE USING (false);
CREATE POLICY "No delete on chat messages" ON public.chat_messages FOR DELETE USING (false);

-- Enable realtime for chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;

-- Weekly highlights (computed, admin-only insert)
CREATE TABLE public.weekly_highlights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  week_start DATE NOT NULL,
  rank_change INTEGER NOT NULL DEFAULT 0,
  vote_increase INTEGER NOT NULL DEFAULT 0,
  top_fan_nickname TEXT,
  highlight_text TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.weekly_highlights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view highlights" ON public.weekly_highlights FOR SELECT USING (true);
CREATE POLICY "No direct insert on highlights" ON public.weekly_highlights FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on highlights" ON public.weekly_highlights FOR UPDATE USING (false);
CREATE POLICY "No delete on highlights" ON public.weekly_highlights FOR DELETE USING (false);
