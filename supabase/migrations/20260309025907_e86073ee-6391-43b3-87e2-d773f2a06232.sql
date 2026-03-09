
-- Add beta tester column to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_beta_tester boolean NOT NULL DEFAULT false;

-- Mark all EXISTING users as beta testers (they are early adopters!)
UPDATE public.profiles SET is_beta_tester = true;

-- Update handle_new_user to mark new signups as beta testers and grant bonus tickets
-- Beta period: until we manually change the default to false
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, is_beta_tester, tickets)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email, ''),
    true,
    10
  );
  
  -- Record the bonus ticket transaction
  INSERT INTO public.ticket_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 10, 'beta_bonus', '🎉 얼리어답터 보너스 티켓');
  
  RETURN NEW;
END;
$$;
