
-- 1) Lock down SECURITY DEFINER trigger functions: never callable directly
REVOKE EXECUTE ON FUNCTION public.increment_votes_count() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.recalculate_ranks() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.record_rank_history() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_post_likes() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_post_comments() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.increment_board_post_comments() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_board_post_likes() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.sync_feed_post_likes() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_board_comment() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_prediction_resolved() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- 2) Internal/admin/cron helpers: not callable by clients
REVOKE EXECUTE ON FUNCTION public.batch_recalculate_ranks() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.ensure_current_monthly_season() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.confirm_payment(uuid, text, text, integer, integer) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.confirm_donation(uuid, uuid, text, text, text, integer, text, boolean) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.add_tickets(uuid, integer, text, text) FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.deduct_tickets(uuid, integer) FROM anon, authenticated, public;

-- 3) User-facing RPCs: revoke from anon (require login). Authenticated keeps execute.
REVOKE EXECUTE ON FUNCTION public.gift_rp(uuid, uuid, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.purchase_season_badge(uuid, uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_my_creator_contact_email(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_fan_level_multiplier(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.get_creator_fan_level(uuid, uuid) FROM anon, public;

-- 4) Read-only stats helpers — keep public access (used in public pages); revoke from public role only as a clean-up but keep anon+authenticated
-- (no change needed — they only return aggregate / non-sensitive data)

-- 5) Lock down settlement_requests so bank_info cannot be read by clients.
-- Drop the SELECT policy entirely; bank_info should only be readable by service role (admin/edge functions).
DROP POLICY IF EXISTS "Creator owner can view settlements" ON public.settlement_requests;

-- Provide a safe summary view (no bank_info) so creators can still see their own requests.
CREATE OR REPLACE VIEW public.my_settlement_requests
WITH (security_invoker = true)
AS
SELECT id, creator_id, amount, status, created_at
FROM public.settlement_requests
WHERE EXISTS (
  SELECT 1 FROM public.creators c
  WHERE c.id = settlement_requests.creator_id
    AND c.user_id = auth.uid()
);

GRANT SELECT ON public.my_settlement_requests TO authenticated;
