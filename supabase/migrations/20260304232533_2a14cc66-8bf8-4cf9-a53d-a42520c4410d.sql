
-- Tournament champions table
CREATE TABLE public.tournament_champions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  tournament_title text NOT NULL DEFAULT '',
  crowned_at timestamp with time zone NOT NULL DEFAULT now(),
  is_featured boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(tournament_id)
);

ALTER TABLE public.tournament_champions ENABLE ROW LEVEL SECURITY;

-- Anyone can view champions
CREATE POLICY "Anyone can view tournament champions"
ON public.tournament_champions FOR SELECT
USING (true);

-- No direct insert/update/delete
CREATE POLICY "No direct insert on tournament_champions"
ON public.tournament_champions FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update on tournament_champions"
ON public.tournament_champions FOR UPDATE
USING (false);

CREATE POLICY "No direct delete on tournament_champions"
ON public.tournament_champions FOR DELETE
USING (false);
