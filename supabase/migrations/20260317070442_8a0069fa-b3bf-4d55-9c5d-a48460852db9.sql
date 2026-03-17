
-- Remove dangerous INSERT and UPDATE policies from user_points
DROP POLICY IF EXISTS "Users can insert own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can update own points" ON public.user_points;

-- Add read-only policy for users to view their own points
-- (SELECT policy should already exist, but ensure it)
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
CREATE POLICY "Users can view own points"
ON public.user_points
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Block all direct inserts
CREATE POLICY "No direct insert on user_points"
ON public.user_points
FOR INSERT
TO public
WITH CHECK (false);

-- Block all direct updates
CREATE POLICY "No direct update on user_points"
ON public.user_points
FOR UPDATE
TO public
USING (false);

-- Block all direct deletes
CREATE POLICY "No direct delete on user_points"
ON public.user_points
FOR DELETE
TO public
USING (false);
