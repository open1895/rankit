
-- Fix 1: Comments table - add server-side validation to INSERT policy
DROP POLICY IF EXISTS "Anyone can insert comments" ON public.comments;
CREATE POLICY "Anyone can insert comments"
ON public.comments
FOR INSERT
WITH CHECK (
  char_length(message) >= 2 AND char_length(message) <= 50
  AND char_length(nickname) >= 2 AND char_length(nickname) <= 20
);

-- Fix 2a: Creators table - add server-side validation to INSERT policy
DROP POLICY IF EXISTS "Anyone can register as creator" ON public.creators;
CREATE POLICY "Anyone can register as creator"
ON public.creators
FOR INSERT
WITH CHECK (
  char_length(name) >= 2 AND char_length(name) <= 50
  AND char_length(channel_link) >= 5 AND char_length(channel_link) <= 300
  AND char_length(category) >= 1 AND char_length(category) <= 20
  AND subscriber_count >= 0
);

-- Fix 2b: Remove overly permissive UPDATE policy on creators
DROP POLICY IF EXISTS "Allow update subscriber_count" ON public.creators;
