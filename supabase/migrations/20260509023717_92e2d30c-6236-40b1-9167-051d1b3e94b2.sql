
-- 1) Revoke public access to claim_message column on creators
REVOKE SELECT (claim_message) ON public.creators FROM anon, authenticated;

-- 2) Fanclub members: restrict reads
DROP POLICY IF EXISTS "Anyone can view fanclub members" ON public.fanclub_members;

CREATE POLICY "Users can view own fanclub memberships"
  ON public.fanclub_members FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Creator owners can view their fanclub members"
  ON public.fanclub_members FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = fanclub_members.creator_id AND c.user_id = auth.uid()
  ));

-- Aggregate RPCs (no PII; only counts)
CREATE OR REPLACE FUNCTION public.get_fanclub_member_counts()
RETURNS TABLE(creator_id uuid, member_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT creator_id, COUNT(*)::bigint AS member_count
  FROM public.fanclub_members
  GROUP BY creator_id;
$$;

CREATE OR REPLACE FUNCTION public.get_creator_fanclub_count(p_creator_id uuid)
RETURNS bigint
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT COUNT(*)::bigint FROM public.fanclub_members WHERE creator_id = p_creator_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_fanclub_member_counts() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_creator_fanclub_count(uuid) TO anon, authenticated;

-- 3) User badges: owner-only read
DROP POLICY IF EXISTS "Anyone can view user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Public can view user badges" ON public.user_badges;
DROP POLICY IF EXISTS "Users can view all badges" ON public.user_badges;

CREATE POLICY "Users can view own badges"
  ON public.user_badges FOR SELECT
  USING (auth.uid() = user_id);

-- 4) seed_activity_settings: admin only read
DROP POLICY IF EXISTS "Authenticated users can read seed settings" ON public.seed_activity_settings;
DROP POLICY IF EXISTS "Anyone can view seed settings" ON public.seed_activity_settings;
DROP POLICY IF EXISTS "seed_activity_settings_select" ON public.seed_activity_settings;

CREATE POLICY "Admins can view seed activity settings"
  ON public.seed_activity_settings FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 5) settlement_requests: owner-scoped SELECT (defense in depth)
CREATE POLICY "Creator owner can view own settlement requests"
  ON public.settlement_requests FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.creators c
    WHERE c.id = settlement_requests.creator_id AND c.user_id = auth.uid()
  ));
