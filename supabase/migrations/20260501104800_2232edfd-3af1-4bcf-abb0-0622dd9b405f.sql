-- 1. Revoke direct SELECT access to sensitive contact_email column from public roles
REVOKE SELECT (contact_email) ON public.creators FROM anon, authenticated;

-- Owners can still read their own contact_email via the existing
-- public.get_my_creator_contact_email(uuid) SECURITY DEFINER function.
-- Admin operations continue to read it via the service-role backed `admin` edge function.

-- 2. Stop broadcasting profiles row changes over Realtime to prevent
-- accidental disclosure of other users' profile data to subscribers.
ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;