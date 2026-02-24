
-- Hall of Fame table: stores weekly/monthly #1 winners
CREATE TABLE public.hall_of_fame (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) ON DELETE CASCADE,
  period_type TEXT NOT NULL CHECK (period_type IN ('weekly', 'monthly')),
  period_label TEXT NOT NULL, -- e.g. '2026-W08', '2026-02'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  final_votes INTEGER NOT NULL DEFAULT 0,
  final_rank INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(period_type, period_label)
);

-- Enable RLS
ALTER TABLE public.hall_of_fame ENABLE ROW LEVEL SECURITY;

-- Everyone can view hall of fame
CREATE POLICY "Anyone can view hall of fame"
  ON public.hall_of_fame FOR SELECT
  USING (true);

-- No direct insert/update/delete from clients
CREATE POLICY "No direct insert on hall_of_fame"
  ON public.hall_of_fame FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No update on hall_of_fame"
  ON public.hall_of_fame FOR UPDATE
  USING (false);

CREATE POLICY "No delete on hall_of_fame"
  ON public.hall_of_fame FOR DELETE
  USING (false);

-- Index for fast lookups
CREATE INDEX idx_hall_of_fame_creator ON public.hall_of_fame(creator_id);
CREATE INDEX idx_hall_of_fame_period ON public.hall_of_fame(period_type, period_start DESC);
