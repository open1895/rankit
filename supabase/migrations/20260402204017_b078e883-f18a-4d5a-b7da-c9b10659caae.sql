-- Revoke column-level SELECT on sensitive columns for client-facing roles
-- Service role (used by edge functions) retains full access
REVOKE SELECT (contact_email, claim_message) ON public.creators FROM anon;
REVOKE SELECT (contact_email, claim_message) ON public.creators FROM authenticated;