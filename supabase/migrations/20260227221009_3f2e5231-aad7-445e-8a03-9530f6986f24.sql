
-- Creator official feed posts
CREATE TABLE public.creator_feed_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '',
  image_url TEXT NOT NULL DEFAULT '',
  likes_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_feed_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feed posts"
  ON public.creator_feed_posts FOR SELECT
  USING (true);

-- Only the creator owner can insert
CREATE POLICY "Creator owner can insert feed posts"
  ON public.creator_feed_posts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = creator_feed_posts.creator_id
        AND creators.user_id = auth.uid()
    )
    AND char_length(content) >= 1
    AND char_length(content) <= 2000
  );

CREATE POLICY "Creator owner can delete own feed posts"
  ON public.creator_feed_posts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.creators
      WHERE creators.id = creator_feed_posts.creator_id
        AND creators.user_id = auth.uid()
    )
  );

CREATE POLICY "No update on feed posts"
  ON public.creator_feed_posts FOR UPDATE
  USING (false);

CREATE INDEX idx_creator_feed_posts_creator ON public.creator_feed_posts(creator_id, created_at DESC);

-- Feed likes
CREATE TABLE public.creator_feed_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.creator_feed_posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.creator_feed_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feed likes"
  ON public.creator_feed_likes FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can like"
  ON public.creator_feed_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unlike"
  ON public.creator_feed_likes FOR DELETE
  USING (auth.uid() = user_id);

CREATE POLICY "No update on feed likes"
  ON public.creator_feed_likes FOR UPDATE
  USING (false);

CREATE INDEX idx_creator_feed_likes_post ON public.creator_feed_likes(post_id);

-- Trigger to sync likes count
CREATE OR REPLACE FUNCTION public.sync_feed_post_likes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.creator_feed_posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.creator_feed_posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER on_feed_like_change
AFTER INSERT OR DELETE ON public.creator_feed_likes
FOR EACH ROW EXECUTE FUNCTION public.sync_feed_post_likes();
