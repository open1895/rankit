
-- Add tickets column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS tickets integer NOT NULL DEFAULT 0;

-- Create ticket_transactions table for history
CREATE TABLE public.ticket_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  amount integer NOT NULL,
  type text NOT NULL,
  description text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ticket_transactions ENABLE ROW LEVEL SECURITY;

-- Users can view own transactions
CREATE POLICY "Users can view own ticket transactions"
ON public.ticket_transactions FOR SELECT
USING (auth.uid() = user_id);

-- No direct insert from client (only via edge function)
CREATE POLICY "No direct insert on ticket_transactions"
ON public.ticket_transactions FOR INSERT
WITH CHECK (false);

CREATE POLICY "No update on ticket_transactions"
ON public.ticket_transactions FOR UPDATE
USING (false);

CREATE POLICY "No delete on ticket_transactions"
ON public.ticket_transactions FOR DELETE
USING (false);

-- Add daily_ticket_claimed_at to profiles for 24h check
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS daily_ticket_claimed_at timestamp with time zone DEFAULT NULL;

-- Create a safe ticket deduction function (prevents negative balance)
CREATE OR REPLACE FUNCTION public.deduct_tickets(p_user_id uuid, p_amount integer)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  current_tickets integer;
BEGIN
  SELECT tickets INTO current_tickets FROM profiles WHERE user_id = p_user_id FOR UPDATE;
  IF current_tickets IS NULL OR current_tickets < p_amount THEN
    RETURN false;
  END IF;
  UPDATE profiles SET tickets = tickets - p_amount WHERE user_id = p_user_id;
  INSERT INTO ticket_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -p_amount, 'spend', '');
  RETURN true;
END;
$$;

-- Create a safe ticket addition function
CREATE OR REPLACE FUNCTION public.add_tickets(p_user_id uuid, p_amount integer, p_type text, p_description text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE profiles SET tickets = tickets + p_amount WHERE user_id = p_user_id;
  INSERT INTO ticket_transactions (user_id, amount, type, description)
  VALUES (p_user_id, p_amount, p_type, p_description);
  RETURN true;
END;
$$;
