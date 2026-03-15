
-- 1. Add super_votes to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS super_votes integer NOT NULL DEFAULT 0;

-- 2. Add combo/super vote columns to votes
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS combo_count integer NOT NULL DEFAULT 1;
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS is_super boolean NOT NULL DEFAULT false;
ALTER TABLE public.votes ADD COLUMN IF NOT EXISTS vote_weight integer NOT NULL DEFAULT 1;

-- 3. Create season_snapshots table
CREATE TABLE IF NOT EXISTS public.season_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  season_id uuid NOT NULL REFERENCES public.seasons(id),
  creator_id uuid NOT NULL REFERENCES public.creators(id),
  votes_count integer NOT NULL DEFAULT 0,
  rank integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.season_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season snapshots" ON public.season_snapshots FOR SELECT TO public USING (true);
CREATE POLICY "No direct insert on season_snapshots" ON public.season_snapshots FOR INSERT TO public WITH CHECK (false);
CREATE POLICY "No update on season_snapshots" ON public.season_snapshots FOR UPDATE TO public USING (false);
CREATE POLICY "No delete on season_snapshots" ON public.season_snapshots FOR DELETE TO public USING (false);

-- 4. Update increment_votes_count trigger to use vote_weight
CREATE OR REPLACE FUNCTION public.increment_votes_count()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.creators
  SET votes_count = votes_count + COALESCE(NEW.vote_weight, 1)
  WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$function$;
