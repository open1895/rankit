
-- Board post comments table
CREATE TABLE public.board_post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  message TEXT NOT NULL,
  user_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.board_post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view board post comments" ON public.board_post_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert board post comments" ON public.board_post_comments FOR INSERT WITH CHECK (
  char_length(nickname) >= 2 AND char_length(nickname) <= 20
  AND char_length(message) >= 1 AND char_length(message) <= 500
);
CREATE POLICY "No update on board_post_comments" ON public.board_post_comments FOR UPDATE USING (false);
CREATE POLICY "No delete on board_post_comments" ON public.board_post_comments FOR DELETE USING (false);

-- Board post likes tracking table
CREATE TABLE public.board_post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.board_posts(id) ON DELETE CASCADE,
  user_identifier TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_identifier)
);

ALTER TABLE public.board_post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view board post likes" ON public.board_post_likes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert board post likes" ON public.board_post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete own board post likes" ON public.board_post_likes FOR DELETE USING (true);
CREATE POLICY "No update on board_post_likes" ON public.board_post_likes FOR UPDATE USING (false);

-- Add comments_count to board_posts
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS comments_count INTEGER NOT NULL DEFAULT 0;

-- Trigger to increment comments_count
CREATE OR REPLACE FUNCTION public.increment_board_post_comments()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.board_posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER on_board_post_comment_insert
  AFTER INSERT ON public.board_post_comments
  FOR EACH ROW EXECUTE FUNCTION public.increment_board_post_comments();

-- Trigger to sync likes count
CREATE OR REPLACE FUNCTION public.sync_board_post_likes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.board_posts SET likes = likes + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.board_posts SET likes = GREATEST(likes - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';

CREATE TRIGGER on_board_post_like_change
  AFTER INSERT OR DELETE ON public.board_post_likes
  FOR EACH ROW EXECUTE FUNCTION public.sync_board_post_likes();
