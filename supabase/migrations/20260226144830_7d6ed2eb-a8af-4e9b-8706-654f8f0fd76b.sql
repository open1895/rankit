
-- Fix 1: board_post_likes DELETE policy - add ownership check
DROP POLICY IF EXISTS "Users can delete own board post likes" ON public.board_post_likes;

CREATE POLICY "Users can delete own board post likes"
ON public.board_post_likes FOR DELETE
USING (
  (auth.uid() IS NOT NULL AND user_identifier = auth.uid()::text)
  OR (auth.uid() IS NULL AND user_identifier = user_identifier)
);

-- Actually, since user_identifier stores hashed IPs or user IDs,
-- and the client filters by .eq("user_identifier", uid), the RLS should verify
-- that the requesting user's identifier matches. For authenticated users we can check auth.uid().
-- For anonymous, we can't verify server-side, so restrict delete to authenticated users only.

DROP POLICY IF EXISTS "Users can delete own board post likes" ON public.board_post_likes;

CREATE POLICY "Users can delete own board post likes"
ON public.board_post_likes FOR DELETE
USING (
  auth.uid() IS NOT NULL AND user_identifier = auth.uid()::text
);

-- Fix 2: board-images storage - add file type validation and file size limit
DROP POLICY IF EXISTS "Anyone can upload board images" ON storage.objects;

CREATE POLICY "Restricted board image uploads"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-images' AND
  lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif') AND
  octet_length(name) < 200
);

-- Set 5MB file size limit on the bucket
UPDATE storage.buckets 
SET file_size_limit = 5242880 
WHERE id = 'board-images';
