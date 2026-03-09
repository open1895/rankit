
CREATE TABLE public.event_banners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  banner_type TEXT NOT NULL DEFAULT 'info',
  link_url TEXT DEFAULT '',
  link_label TEXT DEFAULT '',
  emoji TEXT DEFAULT '🎉',
  bg_color TEXT DEFAULT 'purple',
  is_active BOOLEAN NOT NULL DEFAULT true,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  priority INTEGER NOT NULL DEFAULT 0
);

ALTER TABLE public.event_banners ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read active banners"
ON public.event_banners FOR SELECT
TO anon, authenticated
USING (is_active = true AND starts_at <= now() AND ends_at > now());

CREATE POLICY "Admins can manage banners"
ON public.event_banners FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
