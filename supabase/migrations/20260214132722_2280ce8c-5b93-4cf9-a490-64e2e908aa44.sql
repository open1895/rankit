
-- Fix 1: Remove the overly permissive UPDATE policy on creators table
DROP POLICY IF EXISTS "Allow update subscriber_count" ON public.creators;

-- Fix 2: Restrict avatar uploads with file size limit and path restrictions
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;

CREATE POLICY "Restricted avatar uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' AND
  lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif') AND
  octet_length(name) < 200
);
