
-- Seasons table
CREATE TABLE public.seasons (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_number INTEGER NOT NULL UNIQUE,
  title TEXT NOT NULL DEFAULT '',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  ended_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view seasons" ON public.seasons
  FOR SELECT USING (true);

CREATE POLICY "No insert on seasons" ON public.seasons
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No update on seasons" ON public.seasons
  FOR UPDATE USING (false);

CREATE POLICY "No delete on seasons" ON public.seasons
  FOR DELETE USING (false);

-- Season rankings (final results per season)
CREATE TABLE public.season_rankings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  season_id UUID NOT NULL REFERENCES public.seasons(id),
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  final_rank INTEGER NOT NULL,
  final_votes INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(season_id, creator_id)
);

ALTER TABLE public.season_rankings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season rankings" ON public.season_rankings
  FOR SELECT USING (true);

CREATE POLICY "No insert on season_rankings" ON public.season_rankings
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No update on season_rankings" ON public.season_rankings
  FOR UPDATE USING (false);

CREATE POLICY "No delete on season_rankings" ON public.season_rankings
  FOR DELETE USING (false);

-- Seed past seasons
INSERT INTO public.seasons (season_number, title, started_at, ended_at, is_active) VALUES
  (12, '시즌 12', now(), now() + interval '7 days', true),
  (11, '시즌 11', now() - interval '14 days', now() - interval '7 days', false),
  (10, '시즌 10', now() - interval '21 days', now() - interval '14 days', false),
  (9, '시즌 9', now() - interval '28 days', now() - interval '21 days', false);
