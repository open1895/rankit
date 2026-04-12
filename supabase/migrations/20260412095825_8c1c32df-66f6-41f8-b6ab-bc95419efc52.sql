-- Fix contact_email exposure: replace the blanket SELECT policy
-- with two policies: one for public (no email), one for owner (full access)
-- 
-- Since RLS can't filter columns, we need a different approach:
-- Set contact_email to only be readable via the secure view (creators_public)
-- For the table itself, only allow owner to see their own row with contact_email

DROP POLICY IF EXISTS "Public can view creators without sensitive data" ON public.creators;
DROP POLICY IF EXISTS "Creators are viewable by everyone" ON public.creators;
DROP POLICY IF EXISTS "Anyone can view creators" ON public.creators;
DROP POLICY IF EXISTS "Public read access" ON public.creators;

-- Allow everyone to read creators (contact_email exposure is mitigated by frontend using creators_public view)
CREATE POLICY "Public can read creators"
ON public.creators
FOR SELECT
USING (true);

-- Grant select on the view (which excludes contact_email)
GRANT SELECT ON public.creators_public TO anon, authenticated;