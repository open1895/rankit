
-- Season awards table to store badges and titles granted to creators and fans
CREATE TABLE public.season_awards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id) ON DELETE CASCADE,
  user_id uuid NULL,
  creator_id uuid NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  award_type text NOT NULL DEFAULT 'badge',
  award_key text NOT NULL DEFAULT '',
  award_label text NOT NULL DEFAULT '',
  season_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(season_id, user_id, creator_id, award_key)
);

ALTER TABLE public.season_awards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season awards"
  ON public.season_awards FOR SELECT
  USING (true);

CREATE POLICY "No direct insert on season_awards"
  ON public.season_awards FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No update on season_awards"
  ON public.season_awards FOR UPDATE
  USING (false);

CREATE POLICY "No delete on season_awards"
  ON public.season_awards FOR DELETE
  USING (false);
