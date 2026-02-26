
-- Drop the restrictive insert policy
DROP POLICY "No direct insert on board_posts" ON public.board_posts;

-- Allow anyone to insert board posts with validation
CREATE POLICY "Anyone can insert board posts"
ON public.board_posts
FOR INSERT
WITH CHECK (
  char_length(title) >= 2 AND char_length(title) <= 100
  AND char_length(content) >= 2 AND char_length(content) <= 2000
  AND char_length(author) >= 2 AND char_length(author) <= 20
);
