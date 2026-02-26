
-- Tighten board_post_likes INSERT policy with length check
DROP POLICY "Anyone can insert board post likes" ON public.board_post_likes;
CREATE POLICY "Anyone can insert board post likes" ON public.board_post_likes FOR INSERT WITH CHECK (
  char_length(user_identifier) >= 5 AND char_length(user_identifier) <= 100
);

-- Tighten DELETE to only own likes
DROP POLICY "Anyone can delete own board post likes" ON public.board_post_likes;
CREATE POLICY "Users can delete own board post likes" ON public.board_post_likes FOR DELETE USING (
  char_length(user_identifier) >= 5
);
