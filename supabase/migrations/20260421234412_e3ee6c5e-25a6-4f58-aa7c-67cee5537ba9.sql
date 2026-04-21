-- Revoke column-level SELECT on sensitive contact_email from public roles
REVOKE SELECT (contact_email) ON public.creators FROM anon;
REVOKE SELECT (contact_email) ON public.creators FROM authenticated;

-- Grant SELECT on all other columns explicitly so wildcard SELECT keeps working for non-sensitive fields
GRANT SELECT (
  id, name, avatar_url, category, channel_link, votes_count, rank, is_verified,
  created_at, subscriber_count, user_id, youtube_channel_id, chzzk_channel_id,
  youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers,
  rankit_score, last_stats_updated, claimed, claimed_at, is_promoted,
  promotion_start, promotion_end, featured_until, instagram_handle,
  promotion_type, promotion_status, performance_tier, verification_status,
  claim_message, contact_email
) ON public.creators TO authenticated;

GRANT SELECT (
  id, name, avatar_url, category, channel_link, votes_count, rank, is_verified,
  created_at, subscriber_count, user_id, youtube_channel_id, chzzk_channel_id,
  youtube_subscribers, chzzk_followers, instagram_followers, tiktok_followers,
  rankit_score, last_stats_updated, claimed, claimed_at, is_promoted,
  promotion_start, promotion_end, featured_until, instagram_handle,
  promotion_type, promotion_status, performance_tier, verification_status
) ON public.creators TO anon;

-- Now revoke contact_email specifically from authenticated (we re-revoke after the broad grant)
REVOKE SELECT (contact_email) ON public.creators FROM authenticated;
REVOKE SELECT (contact_email) ON public.creators FROM anon;