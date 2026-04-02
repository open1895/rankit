
-- Recreate the view with SECURITY INVOKER to fix the security definer warning
DROP VIEW IF EXISTS public.creators_public;

CREATE VIEW public.creators_public 
WITH (security_invoker = true) AS
SELECT 
  id, name, avatar_url, category, channel_link, votes_count, rank, 
  is_verified, created_at, subscriber_count, user_id, youtube_channel_id,
  chzzk_channel_id, youtube_subscribers, chzzk_followers, instagram_followers,
  tiktok_followers, rankit_score, last_stats_updated, claimed, claimed_at,
  is_promoted, promotion_start, promotion_end, featured_until, instagram_handle,
  promotion_type, promotion_status, performance_tier, verification_status
FROM public.creators;
