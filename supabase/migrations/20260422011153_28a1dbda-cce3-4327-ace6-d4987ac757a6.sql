CREATE TABLE IF NOT EXISTS public.creator_auto_add_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'scheduled',
  total_added integer NOT NULL DEFAULT 0,
  total_shortfall integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.creator_auto_add_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view auto add runs"
ON public.creator_auto_add_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS creator_auto_add_runs_run_at_idx ON public.creator_auto_add_runs (run_at DESC);