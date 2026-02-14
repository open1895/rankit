
-- Fan board posts table
CREATE TABLE public.posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  likes_count INTEGER NOT NULL DEFAULT 0,
  comments_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view posts" ON public.posts FOR SELECT USING (true);
CREATE POLICY "Anyone can insert posts" ON public.posts FOR INSERT WITH CHECK (
  char_length(title) >= 2 AND char_length(title) <= 100
  AND char_length(content) >= 10 AND char_length(content) <= 2000
  AND char_length(nickname) >= 2 AND char_length(nickname) <= 20
);
CREATE POLICY "No update on posts" ON public.posts FOR UPDATE USING (false);
CREATE POLICY "No delete on posts" ON public.posts FOR DELETE USING (false);

-- Post comments table
CREATE TABLE public.post_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view post comments" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Anyone can insert post comments" ON public.post_comments FOR INSERT WITH CHECK (
  char_length(message) >= 2 AND char_length(message) <= 500
  AND char_length(nickname) >= 2 AND char_length(nickname) <= 20
);
CREATE POLICY "No update on post comments" ON public.post_comments FOR UPDATE USING (false);
CREATE POLICY "No delete on post comments" ON public.post_comments FOR DELETE USING (false);

-- Post likes table (one like per IP per post, tracked via edge function)
CREATE TABLE public.post_likes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  liker_ip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(post_id, liker_ip)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct read on post_likes" ON public.post_likes FOR SELECT USING (false);
CREATE POLICY "Anyone can insert post_likes" ON public.post_likes FOR INSERT WITH CHECK (true);
CREATE POLICY "No update on post_likes" ON public.post_likes FOR UPDATE USING (false);
CREATE POLICY "No delete on post_likes" ON public.post_likes FOR DELETE USING (false);

-- Trigger to increment likes_count on posts
CREATE OR REPLACE FUNCTION public.increment_post_likes()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_like_insert
AFTER INSERT ON public.post_likes
FOR EACH ROW EXECUTE FUNCTION public.increment_post_likes();

-- Trigger to increment comments_count on posts
CREATE OR REPLACE FUNCTION public.increment_post_comments()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_post_comment_insert
AFTER INSERT ON public.post_comments
FOR EACH ROW EXECUTE FUNCTION public.increment_post_comments();

-- Enable realtime for posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.posts;

-- Update recalculate_ranks to include posts activity
CREATE OR REPLACE FUNCTION public.recalculate_ranks()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  WITH activity_scores AS (
    SELECT 
      c.id,
      c.subscriber_count,
      c.votes_count,
      COALESCE(cmt.cnt, 0) + COALESCE(pst.cnt, 0) * 2 + COALESCE(plk.cnt, 0) as activity_score
    FROM public.creators c
    LEFT JOIN (
      SELECT creator_id, COUNT(*) as cnt FROM public.comments GROUP BY creator_id
    ) cmt ON cmt.creator_id = c.id
    LEFT JOIN (
      SELECT creator_id, COUNT(*) as cnt FROM public.posts GROUP BY creator_id
    ) pst ON pst.creator_id = c.id
    LEFT JOIN (
      SELECT p.creator_id, COUNT(*) as cnt 
      FROM public.post_likes pl JOIN public.posts p ON p.id = pl.post_id 
      GROUP BY p.creator_id
    ) plk ON plk.creator_id = c.id
  ),
  max_values AS (
    SELECT 
      GREATEST(MAX(subscriber_count), 1) as max_subs,
      GREATEST(MAX(votes_count), 1) as max_votes,
      GREATEST(MAX(activity_score), 1) as max_activity
    FROM activity_scores
  ),
  influence AS (
    SELECT 
      a.id,
      (a.subscriber_count::float / m.max_subs) * 0.4 +
      (a.votes_count::float / m.max_votes) * 0.4 +
      (a.activity_score::float / m.max_activity) * 0.2 as score
    FROM activity_scores a, max_values m
  ),
  ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC, id ASC) as new_rank
    FROM influence
  )
  UPDATE public.creators c
  SET rank = r.new_rank
  FROM ranked r
  WHERE c.id = r.id;
  RETURN NULL;
END;
$$;
