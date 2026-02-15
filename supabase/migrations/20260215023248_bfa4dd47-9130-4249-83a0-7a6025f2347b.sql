
-- Add user_id column to creators (nullable for existing records)
ALTER TABLE public.creators ADD COLUMN IF NOT EXISTS user_id uuid;

-- Backfill: leave existing creators with NULL user_id (they can't be edited)

-- Add UPDATE policy: only the creator owner can update their own profile
CREATE POLICY "Creator owner can update own profile"
ON public.creators
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND char_length(name) >= 2 AND char_length(name) <= 50
  AND char_length(channel_link) >= 5 AND char_length(channel_link) <= 300
  AND char_length(category) >= 1 AND char_length(category) <= 20
  AND subscriber_count >= 0
);

-- Update INSERT policy to include user_id
DROP POLICY IF EXISTS "Authenticated users can register as creator" ON public.creators;
CREATE POLICY "Authenticated users can register as creator"
ON public.creators
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND user_id = auth.uid()
  AND char_length(name) >= 2 AND char_length(name) <= 50
  AND char_length(channel_link) >= 5 AND char_length(channel_link) <= 300
  AND char_length(category) >= 1 AND char_length(category) <= 20
  AND subscriber_count >= 0
);
