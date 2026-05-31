CREATE OR REPLACE FUNCTION public.deduct_rp(p_user_id uuid, p_amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_balance integer;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;

  INSERT INTO public.user_points (user_id, balance, total_earned)
  VALUES (p_user_id, 0, 0)
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.user_points
  SET balance = balance - p_amount,
      updated_at = now()
  WHERE user_id = p_user_id AND balance >= p_amount
  RETURNING balance INTO v_new_balance;

  IF v_new_balance IS NULL THEN
    RETURN NULL;
  END IF;

  RETURN v_new_balance;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_rp(uuid, integer) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.deduct_rp(uuid, integer) TO service_role;