
-- Boost campaigns table
CREATE TABLE public.boost_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  started_by uuid NOT NULL,
  goal integer NOT NULL DEFAULT 500,
  current_points integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  started_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Boost contributions table
CREATE TABLE public.boost_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.boost_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  action_type text NOT NULL DEFAULT 'vote',
  points integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.boost_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.boost_contributions ENABLE ROW LEVEL SECURITY;

-- RLS policies for boost_campaigns
CREATE POLICY "Anyone can view boost campaigns" ON public.boost_campaigns FOR SELECT USING (true);
CREATE POLICY "Authenticated users can create campaigns" ON public.boost_campaigns FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = started_by);
CREATE POLICY "No direct update on campaigns" ON public.boost_campaigns FOR UPDATE USING (false);
CREATE POLICY "No delete on campaigns" ON public.boost_campaigns FOR DELETE USING (false);

-- RLS policies for boost_contributions
CREATE POLICY "Anyone can view contributions" ON public.boost_contributions FOR SELECT USING (true);
CREATE POLICY "No direct insert on contributions" ON public.boost_contributions FOR INSERT WITH CHECK (false);
CREATE POLICY "No update on contributions" ON public.boost_contributions FOR UPDATE USING (false);
CREATE POLICY "No delete on contributions" ON public.boost_contributions FOR DELETE USING (false);

-- Enable realtime for boost_campaigns
ALTER PUBLICATION supabase_realtime ADD TABLE public.boost_campaigns;
