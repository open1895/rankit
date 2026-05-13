
CREATE TABLE IF NOT EXISTS public.cron_auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  token text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.cron_auth_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admins can read cron tokens"
  ON public.cron_auth_tokens FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins can manage cron tokens"
  ON public.cron_auth_tokens FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

INSERT INTO public.cron_auth_tokens (name, token)
VALUES ('default', encode(gen_random_bytes(32), 'hex'))
ON CONFLICT (name) DO NOTHING;
