
-- 1. Hide creators.contact_email from public/auth selects (owner can still read via RPC)
REVOKE SELECT (contact_email) ON public.creators FROM anon, authenticated;

-- 2. Hide boost_campaigns.started_by from public selects
REVOKE SELECT (started_by) ON public.boost_campaigns FROM anon, authenticated;

-- 3. Admin can view all settlement requests
DROP POLICY IF EXISTS "Admins can view all settlement requests" ON public.settlement_requests;
CREATE POLICY "Admins can view all settlement requests"
ON public.settlement_requests
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 4. Remove misleading vote insert policy that blocks everything (inserts go through SECURITY DEFINER RPCs)
DROP POLICY IF EXISTS "Service role can insert votes" ON public.votes;
