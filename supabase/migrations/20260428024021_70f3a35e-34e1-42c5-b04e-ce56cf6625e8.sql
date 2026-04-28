
-- 1) Restrict sensitive columns on public.creators at the column-privilege level.
-- The "Public can read creators" RLS policy stays (true), but column GRANTs
-- prevent anon/authenticated from selecting sensitive fields. Service role
-- (used by edge functions) and table owner retain full access. Owners read
-- their own contact_email via public.get_my_creator_contact_email().

REVOKE SELECT ON public.creators FROM anon, authenticated;

GRANT SELECT (
  id, name, avatar_url, category, votes_count, rank, is_verified, created_at,
  channel_link, subscriber_count, user_id, youtube_subscribers, chzzk_followers,
  instagram_followers, tiktok_followers, rankit_score, youtube_channel_id,
  chzzk_channel_id, last_stats_updated, claimed, claimed_at, verification_status,
  instagram_handle, is_promoted, promotion_type, promotion_start, promotion_end,
  promotion_status, performance_tier, featured_until
) ON public.creators TO anon, authenticated;

-- Note: contact_email and claim_message are intentionally excluded.
-- Admins access via service role; creator owners use get_my_creator_contact_email().

-- 2) Lock down realtime.messages (Broadcast/Presence). The app uses
-- postgres_changes only, which is governed by table RLS, not realtime.messages.
-- Default-deny prevents authenticated/anon users from subscribing to arbitrary
-- broadcast topics carrying other users' data.

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "deny_all_realtime_messages" ON realtime.messages;
CREATE POLICY "deny_all_realtime_messages"
ON realtime.messages
AS RESTRICTIVE
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);
