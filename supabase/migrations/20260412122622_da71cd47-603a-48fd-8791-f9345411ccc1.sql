-- 1. Add unique index on order_id to prevent duplicate payments at DB level
CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_history_order_id_unique 
ON public.payment_history (order_id);

-- 2. Update confirm_payment to check for duplicates
CREATE OR REPLACE FUNCTION public.confirm_payment(
  p_user_id uuid, 
  p_order_id text, 
  p_payment_id text, 
  p_amount integer, 
  p_ticket_amount integer
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  existing_count integer;
BEGIN
  -- Check for duplicate order_id (already completed)
  SELECT COUNT(*) INTO existing_count 
  FROM public.payment_history 
  WHERE order_id = p_order_id AND status = 'completed';
  
  IF existing_count > 0 THEN
    RAISE EXCEPTION 'Duplicate order: %', p_order_id;
  END IF;

  -- 결제 내역 삽입
  INSERT INTO public.payment_history (user_id, amount, ticket_amount, order_id, payment_id, status)
  VALUES (p_user_id, p_amount, p_ticket_amount, p_order_id, p_payment_id, 'completed');

  -- 티켓 지급
  UPDATE public.profiles SET tickets = tickets + p_ticket_amount WHERE user_id = p_user_id;

  -- 거래 기록
  INSERT INTO public.ticket_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_ticket_amount, 'purchase', '💎 티켓 충전 (' || p_amount || '원)');

  RETURN true;
END;
$$;