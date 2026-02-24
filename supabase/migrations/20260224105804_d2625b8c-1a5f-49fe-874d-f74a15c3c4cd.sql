
-- Create board_posts table for Rankit 게시판
CREATE TABLE public.board_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL DEFAULT '공지',
  title text NOT NULL,
  content text NOT NULL DEFAULT '',
  author text NOT NULL DEFAULT 'Rankit 운영팀',
  likes integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.board_posts ENABLE ROW LEVEL SECURITY;

-- Anyone can view active posts
CREATE POLICY "Anyone can view active board posts"
  ON public.board_posts FOR SELECT
  USING (is_active = true);

-- No direct insert/update/delete (admin edge function handles this)
CREATE POLICY "No direct insert on board_posts"
  ON public.board_posts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No direct update on board_posts"
  ON public.board_posts FOR UPDATE
  USING (false);

CREATE POLICY "No direct delete on board_posts"
  ON public.board_posts FOR DELETE
  USING (false);
