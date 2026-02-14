
-- Referral codes table
CREATE TABLE public.referral_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  nickname TEXT NOT NULL,
  bonus_votes_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view referral codes" ON public.referral_codes
  FOR SELECT USING (true);

CREATE POLICY "Anyone can create referral codes" ON public.referral_codes
  FOR INSERT WITH CHECK (
    char_length(code) >= 6 AND char_length(code) <= 20
    AND char_length(nickname) >= 2 AND char_length(nickname) <= 20
  );

CREATE POLICY "No update on referral_codes" ON public.referral_codes
  FOR UPDATE USING (false);

CREATE POLICY "No delete on referral_codes" ON public.referral_codes
  FOR DELETE USING (false);

-- Referral uses tracking
CREATE TABLE public.referral_uses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referral_code TEXT NOT NULL,
  used_by_ip TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(referral_code, used_by_ip)
);

ALTER TABLE public.referral_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access on referral_uses" ON public.referral_uses
  FOR SELECT USING (false);

CREATE POLICY "No direct insert on referral_uses" ON public.referral_uses
  FOR INSERT WITH CHECK (false);

CREATE POLICY "No update on referral_uses" ON public.referral_uses
  FOR UPDATE USING (false);

CREATE POLICY "No delete on referral_uses" ON public.referral_uses
  FOR DELETE USING (false);
