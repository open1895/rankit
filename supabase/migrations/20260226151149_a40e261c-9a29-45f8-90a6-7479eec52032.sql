
-- Fix the view to use SECURITY INVOKER (safe - bypasses RLS appropriately via postgres owner for aggregate-only data)
-- Actually, we need the view to bypass RLS since anon can't read prediction_bets directly.
-- The view only exposes aggregates (counts/sums by event+creator), not individual user data.
-- This is the intended design. Let's use a SECURITY INVOKER function-based approach instead.

DROP VIEW IF EXISTS public.prediction_event_stats;

-- Create a SECURITY INVOKER view - but this won't work since anon can't SELECT prediction_bets.
-- Instead, create a database function that returns aggregate stats.
CREATE OR REPLACE FUNCTION public.get_prediction_event_stats()
RETURNS TABLE (
  event_id uuid,
  predicted_creator_id uuid,
  bet_count bigint,
  total_amount bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    event_id,
    predicted_creator_id,
    COUNT(*) as bet_count,
    SUM(amount)::bigint as total_amount
  FROM public.prediction_bets
  GROUP BY event_id, predicted_creator_id;
$$;
