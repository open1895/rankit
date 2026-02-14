-- Fix 1: Add file extension validation to avatars upload policy
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
);

-- Fix 2: Replace overly permissive INSERT policies on votes and post_likes
-- These tables are only written to by edge functions using service_role_key,
-- so we can restrict direct client inserts while edge functions bypass RLS.
DROP POLICY IF EXISTS "Anyone can insert votes" ON public.votes;
CREATE POLICY "Service role can insert votes"
ON public.votes FOR INSERT
WITH CHECK (false);

DROP POLICY IF EXISTS "Anyone can insert post_likes" ON public.post_likes;
CREATE POLICY "Service role can insert post_likes"
ON public.post_likes FOR INSERT
WITH CHECK (false);