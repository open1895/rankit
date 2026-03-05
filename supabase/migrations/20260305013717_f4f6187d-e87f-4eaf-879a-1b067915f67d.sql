
-- Create battles table
CREATE TABLE public.battles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_a_id uuid NOT NULL REFERENCES public.creators(id),
  creator_b_id uuid NOT NULL REFERENCES public.creators(id),
  votes_a integer NOT NULL DEFAULT 0,
  votes_b integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  featured boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  ends_at timestamp with time zone NOT NULL DEFAULT (now() + interval '24 hours')
);

-- Create battle_votes table
CREATE TABLE public.battle_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id uuid NOT NULL REFERENCES public.battles(id),
  user_id uuid NOT NULL,
  voted_creator_id uuid NOT NULL REFERENCES public.creators(id),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(battle_id, user_id)
);

-- Enable RLS
ALTER TABLE public.battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battle_votes ENABLE ROW LEVEL SECURITY;

-- Battles policies
CREATE POLICY "Anyone can view battles" ON public.battles FOR SELECT USING (true);
CREATE POLICY "No direct insert on battles" ON public.battles FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on battles" ON public.battles FOR UPDATE USING (false);
CREATE POLICY "No delete on battles" ON public.battles FOR DELETE USING (false);

-- Battle votes policies
CREATE POLICY "Users can view own battle votes" ON public.battle_votes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "No direct insert on battle_votes" ON public.battle_votes FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on battle_votes" ON public.battle_votes FOR UPDATE USING (false);
CREATE POLICY "No delete on battle_votes" ON public.battle_votes FOR DELETE USING (false);

-- Enable realtime for battles
ALTER PUBLICATION supabase_realtime ADD TABLE public.battles;
