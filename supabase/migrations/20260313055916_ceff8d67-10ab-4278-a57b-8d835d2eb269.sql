
ALTER TABLE public.creators
  ADD COLUMN IF NOT EXISTS is_promoted boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS promotion_type text NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS promotion_start timestamptz,
  ADD COLUMN IF NOT EXISTS promotion_end timestamptz,
  ADD COLUMN IF NOT EXISTS promotion_status text NOT NULL DEFAULT 'none';
