
CREATE TABLE public.nominations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_name TEXT NOT NULL,
  channel_url TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT '',
  reason TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.nominations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert nominations"
  ON public.nominations FOR INSERT
  WITH CHECK (
    char_length(creator_name) >= 2 AND char_length(creator_name) <= 50
    AND char_length(channel_url) >= 5 AND char_length(channel_url) <= 500
    AND char_length(category) <= 50
    AND char_length(reason) <= 500
  );

CREATE POLICY "No direct read on nominations"
  ON public.nominations FOR SELECT
  USING (false);

CREATE POLICY "No update on nominations"
  ON public.nominations FOR UPDATE
  USING (false);

CREATE POLICY "No delete on nominations"
  ON public.nominations FOR DELETE
  USING (false);
