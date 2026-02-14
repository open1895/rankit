
-- Create comments table for fan messages
CREATE TABLE public.comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  message TEXT NOT NULL,
  vote_count INTEGER NOT NULL DEFAULT 0,
  post_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Anyone can read comments
CREATE POLICY "Anyone can view comments"
ON public.comments FOR SELECT
USING (true);

-- Anyone can insert comments
CREATE POLICY "Anyone can insert comments"
ON public.comments FOR INSERT
WITH CHECK (true);

-- No update or delete
CREATE POLICY "No update on comments"
ON public.comments FOR UPDATE
USING (false);

CREATE POLICY "No delete on comments"
ON public.comments FOR DELETE
USING (false);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;
