-- Remove overly-permissive SELECT on user_badges
DROP POLICY IF EXISTS "Anyone can view owned badges" ON public.user_badges;

-- Remove overly-permissive SELECT on seed_activity_settings
DROP POLICY IF EXISTS "Anyone authenticated can view seed settings" ON public.seed_activity_settings;

-- Hide started_by column from public on boost_campaigns
REVOKE SELECT (started_by) ON public.boost_campaigns FROM anon, authenticated;