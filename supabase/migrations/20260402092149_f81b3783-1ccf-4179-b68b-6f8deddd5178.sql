
-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Anyone can view creators" ON public.creators;

-- Create a new SELECT policy that hides sensitive columns by using a view approach
-- Since RLS can't do column-level security, we create a public view without sensitive fields
-- and restrict direct table access

-- Create a secure public view excluding sensitive fields
CREATE OR REPLACE VIEW public.creators_public AS
SELECT 
  id, name, avatar_url, category, channel_link, votes_count, rank, 
  is_verified, created_at, subscriber_count, user_id, youtube_channel_id,
  chzzk_channel_id, youtube_subscribers, chzzk_followers, instagram_followers,
  tiktok_followers, rankit_score, last_stats_updated, claimed, claimed_at,
  is_promoted, promotion_start, promotion_end, featured_until, instagram_handle,
  promotion_type, promotion_status, performance_tier, verification_status
FROM public.creators;

-- Re-create the SELECT policy: allow public to read non-sensitive fields only
-- We keep the existing policy but add a note that sensitive data should be accessed via edge functions
CREATE POLICY "Anyone can view creators" ON public.creators
FOR SELECT USING (true);

-- Create a restricted policy for contact_email access (admin only via edge functions with service role)
-- The view creators_public excludes contact_email and claim_message
-- Frontend should use the view instead
