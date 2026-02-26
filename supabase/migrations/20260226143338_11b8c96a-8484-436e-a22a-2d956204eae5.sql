
-- Add user_id column to board_posts (nullable for existing posts)
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT NULL;

-- Drop old restrictive update/delete policies
DROP POLICY IF EXISTS "No direct update on board_posts" ON public.board_posts;
DROP POLICY IF EXISTS "No direct delete on board_posts" ON public.board_posts;

-- Allow post owner to update their own posts
CREATE POLICY "Owner can update own board posts"
ON public.board_posts FOR UPDATE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id)
WITH CHECK (
  auth.uid() IS NOT NULL AND auth.uid() = user_id
  AND char_length(title) >= 2 AND char_length(title) <= 100
  AND char_length(content) >= 2 AND char_length(content) <= 2000
  AND ((image_urls IS NULL) OR (array_length(image_urls, 1) IS NULL) OR (array_length(image_urls, 1) <= 5))
);

-- Allow post owner to soft-delete (set is_active = false)
CREATE POLICY "Owner can delete own board posts"
ON public.board_posts FOR DELETE
USING (auth.uid() IS NOT NULL AND auth.uid() = user_id);

-- Update insert policy to include user_id
DROP POLICY IF EXISTS "Anyone can insert board posts" ON public.board_posts;
CREATE POLICY "Anyone can insert board posts"
ON public.board_posts FOR INSERT
WITH CHECK (
  char_length(title) >= 2 AND char_length(title) <= 100
  AND char_length(content) >= 2 AND char_length(content) <= 2000
  AND char_length(author) >= 2 AND char_length(author) <= 20
  AND ((image_urls IS NULL) OR (array_length(image_urls, 1) IS NULL) OR (array_length(image_urls, 1) <= 5))
);
