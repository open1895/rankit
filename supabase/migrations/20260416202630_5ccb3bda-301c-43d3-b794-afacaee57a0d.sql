-- ─── 1. fanclub_members ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.fanclub_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (creator_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_fanclub_members_creator ON public.fanclub_members(creator_id);
CREATE INDEX IF NOT EXISTS idx_fanclub_members_user ON public.fanclub_members(user_id);

ALTER TABLE public.fanclub_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view fanclub members"
  ON public.fanclub_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join fanclubs themselves"
  ON public.fanclub_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can leave own fanclubs"
  ON public.fanclub_members FOR DELETE
  USING (auth.uid() = user_id);

-- ─── 2. creator_messages (Lv3+ 응원 메시지) ────────────
CREATE TABLE IF NOT EXISTS public.creator_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  sender_nickname text NOT NULL DEFAULT '익명',
  message text NOT NULL,
  fan_level integer NOT NULL DEFAULT 1,
  is_read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT message_length CHECK (char_length(message) BETWEEN 2 AND 200)
);

CREATE INDEX IF NOT EXISTS idx_creator_messages_creator ON public.creator_messages(creator_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_creator_messages_sender ON public.creator_messages(sender_id);

ALTER TABLE public.creator_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Senders can view own messages"
  ON public.creator_messages FOR SELECT
  USING (auth.uid() = sender_id);

CREATE POLICY "Creator owners can view received messages"
  ON public.creator_messages FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = creator_messages.creator_id
      AND creators.user_id = auth.uid()
  ));

CREATE POLICY "Authenticated users can send messages"
  ON public.creator_messages FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Creator owners can mark messages as read"
  ON public.creator_messages FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.creators
    WHERE creators.id = creator_messages.creator_id
      AND creators.user_id = auth.uid()
  ));

-- ─── 3. chat_messages 확장 (is_fanclub) ────────────────
ALTER TABLE public.chat_messages
  ADD COLUMN IF NOT EXISTS is_fanclub boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_chat_messages_creator_fanclub
  ON public.chat_messages(creator_id, is_fanclub, created_at DESC);

-- ─── 4. 크리에이터별 팬 레벨 계산 함수 ──────────────────
CREATE OR REPLACE FUNCTION public.get_creator_fan_level(
  p_user_id uuid,
  p_creator_id uuid
)
RETURNS TABLE (fan_level integer, fan_points integer)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_nickname text;
  vote_count bigint := 0;
  post_count bigint := 0;
  comment_count bigint := 0;
  total_points integer;
  lvl integer;
BEGIN
  SELECT display_name INTO user_nickname
    FROM public.profiles WHERE user_id = p_user_id;

  -- 해당 크리에이터에 대한 votes
  SELECT COUNT(*) INTO vote_count
    FROM public.votes
    WHERE user_id = p_user_id AND creator_id = p_creator_id;

  -- 해당 크리에이터의 posts (닉네임 기준)
  IF user_nickname IS NOT NULL THEN
    SELECT COUNT(*) INTO post_count
      FROM public.posts
      WHERE creator_id = p_creator_id AND nickname = user_nickname;

    -- 해당 크리에이터의 comments (응원톡)
    SELECT COUNT(*) INTO comment_count
      FROM public.comments
      WHERE creator_id = p_creator_id AND nickname = user_nickname;
  END IF;

  total_points := (vote_count * 3) + (post_count * 5) + (comment_count * 1);

  IF total_points >= 500 THEN lvl := 4;
  ELSIF total_points >= 200 THEN lvl := 3;
  ELSIF total_points >= 50 THEN lvl := 2;
  ELSE lvl := 1;
  END IF;

  RETURN QUERY SELECT lvl, total_points;
END;
$$;