-- 1. Revoke column-level SELECT on sensitive creator fields
-- This prevents anon/authenticated from reading these columns even though row-level SELECT is allowed
REVOKE SELECT (contact_email, claim_message) ON public.creators FROM anon, authenticated;

-- 2. Restrict board_post_likes SELECT to own likes only
DROP POLICY IF EXISTS "Anyone can view board post likes" ON public.board_post_likes;

CREATE POLICY "Users can view own board post likes"
  ON public.board_post_likes
  FOR SELECT
  USING (user_identifier = (auth.uid())::text);
