-- 1. Remove duplicate avatar upload policies (keep only the one with ownership check)
DROP POLICY IF EXISTS "Authenticated avatar uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

-- Also drop the one we created in last migration (it duplicated the existing good one)
DROP POLICY IF EXISTS "Authenticated users can upload own avatars" ON storage.objects;

-- The existing good one "Authenticated users can upload own avatar" remains

-- 2. Fix boost_contributions: replace public SELECT with authenticated-only
DROP POLICY IF EXISTS "Anyone can view contributions" ON storage.objects;
DROP POLICY "Anyone can view contributions" ON public.boost_contributions;

CREATE POLICY "Authenticated users can view contributions"
ON public.boost_contributions
FOR SELECT
TO authenticated
USING (true);

-- 3. Also drop the duplicate policy we created if it exists
DROP POLICY IF EXISTS "Authenticated users can view all contributions" ON public.boost_contributions;