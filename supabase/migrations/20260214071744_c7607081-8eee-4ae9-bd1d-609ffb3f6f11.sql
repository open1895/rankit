
-- Create creators table
CREATE TABLE public.creators (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  avatar_url TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL DEFAULT '',
  votes_count INTEGER NOT NULL DEFAULT 0,
  rank INTEGER NOT NULL DEFAULT 0,
  is_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create votes table
CREATE TABLE public.votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  voter_ip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.votes ENABLE ROW LEVEL SECURITY;

-- Creators are publicly readable
CREATE POLICY "Anyone can view creators"
  ON public.creators FOR SELECT
  USING (true);

-- Votes can be inserted by anyone (IP check done via edge function)
CREATE POLICY "Anyone can insert votes"
  ON public.votes FOR INSERT
  WITH CHECK (true);

-- No one can read votes directly (protect IP addresses)
CREATE POLICY "No direct read on votes"
  ON public.votes FOR SELECT
  USING (false);

-- No update/delete on votes
CREATE POLICY "No update on votes"
  ON public.votes FOR UPDATE
  USING (false);

CREATE POLICY "No delete on votes"
  ON public.votes FOR DELETE
  USING (false);

-- Trigger: update creator votes_count on new vote
CREATE OR REPLACE FUNCTION public.increment_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.creators
  SET votes_count = votes_count + 1
  WHERE id = NEW.creator_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_vote_inserted
  AFTER INSERT ON public.votes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_votes_count();

-- Trigger: recalculate ranks after votes_count changes
CREATE OR REPLACE FUNCTION public.recalculate_ranks()
RETURNS TRIGGER AS $$
BEGIN
  WITH ranked AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY votes_count DESC, created_at ASC) as new_rank
    FROM public.creators
  )
  UPDATE public.creators c
  SET rank = r.new_rank
  FROM ranked r
  WHERE c.id = r.id;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_creator_votes_updated
  AFTER UPDATE OF votes_count ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.recalculate_ranks();

-- Enable realtime for creators table
ALTER PUBLICATION supabase_realtime ADD TABLE public.creators;

-- Create index for vote dedup check
CREATE INDEX idx_votes_creator_ip_time ON public.votes (creator_id, voter_ip, created_at DESC);

-- Seed initial creators data
INSERT INTO public.creators (name, avatar_url, category, votes_count, rank, is_verified) VALUES
  ('김딩고', '🎵', '음악/커버', 15234, 1, true),
  ('코딩하는 거니', '💻', '테크/코딩', 14891, 2, true),
  ('먹방요정 수아', '🍜', '먹방/요리', 14200, 3, true),
  ('댄스킹 준호', '💃', '댄스/퍼포먼스', 13890, 4, true),
  ('뷰티퀸 하나', '💄', '뷰티/패션', 12500, 5, true),
  ('게임마스터 태윤', '🎮', '게임/스트리밍', 11800, 6, true),
  ('여행자 민서', '✈️', '여행/브이로그', 10500, 7, false),
  ('드로잉 소희', '🎨', '아트/일러스트', 9800, 8, false),
  ('피트니스 강현', '💪', 'fitness/운동', 8900, 9, false),
  ('독서왕 예진', '📚', '교육/독서', 7600, 10, false);
