
-- 결제 내역 테이블
CREATE TABLE public.payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  ticket_amount integer NOT NULL DEFAULT 0,
  order_id text NOT NULL UNIQUE,
  payment_id text,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.payment_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments" ON public.payment_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "No direct insert" ON public.payment_history
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No direct update" ON public.payment_history
  FOR UPDATE USING (false);

CREATE POLICY "No direct delete" ON public.payment_history
  FOR DELETE USING (false);

CREATE INDEX idx_payment_history_user_id ON public.payment_history(user_id);
CREATE INDEX idx_payment_history_order_id ON public.payment_history(order_id);

-- 결제 확인 + 티켓 지급 원자적 함수
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
SET search_path = public
AS $$
BEGIN
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

-- updated_at 트리거
CREATE TRIGGER update_payment_history_updated_at
  BEFORE UPDATE ON public.payment_history
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
