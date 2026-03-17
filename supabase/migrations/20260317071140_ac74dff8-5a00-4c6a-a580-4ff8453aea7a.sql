
-- Create deduplication table for adpopcorn callbacks
CREATE TABLE public.adpopcorn_callbacks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  camp_id text NOT NULL,
  ad_id text NOT NULL DEFAULT '',
  user_id uuid NOT NULL,
  reward integer NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(camp_id, ad_id, user_id)
);

-- RLS: no public access, only service role
ALTER TABLE public.adpopcorn_callbacks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No public access on adpopcorn_callbacks"
ON public.adpopcorn_callbacks
FOR ALL
TO public
USING (false)
WITH CHECK (false);
