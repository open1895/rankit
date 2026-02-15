-- Update creators INSERT policy to require authentication
DROP POLICY IF EXISTS "Anyone can register as creator" ON public.creators;
CREATE POLICY "Authenticated users can register as creator"
ON public.creators
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL
  AND char_length(name) >= 2 AND char_length(name) <= 50
  AND char_length(channel_link) >= 5 AND char_length(channel_link) <= 300
  AND char_length(category) >= 1 AND char_length(category) <= 20
  AND subscriber_count >= 0
);

-- Update avatar upload policy to require authentication
DROP POLICY IF EXISTS "Restricted avatar uploads" ON storage.objects;
CREATE POLICY "Authenticated avatar uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif') AND
  octet_length(name) < 200
);