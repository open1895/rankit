-- 1. Restrict boost_contributions SELECT to the user's own rows only
DROP POLICY IF EXISTS "Authenticated users can view contributions" ON public.boost_contributions;

CREATE POLICY "Users can view their own boost contributions"
ON public.boost_contributions
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins can still view all (for moderation / dashboards)
CREATE POLICY "Admins can view all boost contributions"
ON public.boost_contributions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::public.app_role));

-- 2. Drop the recipient_email column from creator_milestone_notifications.
-- The send pipeline reads creators.contact_email at send-time; the tracking
-- table only needs creator_id + milestone_type to enforce dedup, so the
-- email column was unnecessary attack surface.
ALTER TABLE public.creator_milestone_notifications
  DROP COLUMN IF EXISTS recipient_email;