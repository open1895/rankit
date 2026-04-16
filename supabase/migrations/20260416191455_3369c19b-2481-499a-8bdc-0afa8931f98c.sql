-- 1. creator_earnings에 donation_total 컬럼 추가
ALTER TABLE public.creator_earnings 
ADD COLUMN IF NOT EXISTS donation_total integer NOT NULL DEFAULT 0;

-- 2. creator_donations 테이블 생성
CREATE TABLE public.creator_donations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id uuid NOT NULL,
  donor_id uuid NOT NULL,
  donor_nickname text NOT NULL DEFAULT '익명',
  amount integer NOT NULL CHECK (amount >= 1000 AND amount <= 1000000),
  platform_fee integer NOT NULL DEFAULT 0,
  net_amount integer NOT NULL DEFAULT 0,
  message text,
  is_message_public boolean NOT NULL DEFAULT true,
  payment_id text NOT NULL UNIQUE,
  order_id text NOT NULL UNIQUE,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- 인덱스
CREATE INDEX idx_creator_donations_creator_id ON public.creator_donations(creator_id, created_at DESC);
CREATE INDEX idx_creator_donations_donor_id ON public.creator_donations(donor_id, created_at DESC);
CREATE INDEX idx_creator_donations_status ON public.creator_donations(status);

-- 3. RLS 활성화
ALTER TABLE public.creator_donations ENABLE ROW LEVEL SECURITY;

-- 4. RLS 정책: 후원자 본인이 자신의 후원 내역 조회
CREATE POLICY "Donors can view own donations"
ON public.creator_donations
FOR SELECT
USING (auth.uid() = donor_id);

-- 5. RLS 정책: 크리에이터 본인이 자신에게 온 후원 내역 조회
CREATE POLICY "Creator owner can view received donations"
ON public.creator_donations
FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.creators
  WHERE creators.id = creator_donations.creator_id
    AND creators.user_id = auth.uid()
));

-- 6. RLS 정책: 누구나 공개된 완료 후원의 메시지 조회 (최근 노출용)
CREATE POLICY "Anyone can view public completed donations"
ON public.creator_donations
FOR SELECT
USING (status = 'completed' AND is_message_public = true);

-- 7. RLS 정책: 직접 INSERT/UPDATE/DELETE 차단
CREATE POLICY "No direct insert on donations"
ON public.creator_donations
FOR INSERT
WITH CHECK (false);

CREATE POLICY "No direct update on donations"
ON public.creator_donations
FOR UPDATE
USING (false);

CREATE POLICY "No delete on donations"
ON public.creator_donations
FOR DELETE
USING (false);

-- 8. updated_at 자동 갱신 트리거
CREATE TRIGGER update_creator_donations_updated_at
BEFORE UPDATE ON public.creator_donations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- 9. 후원 확정 처리 함수 (원자적 트랜잭션)
CREATE OR REPLACE FUNCTION public.confirm_donation(
  p_donor_id uuid,
  p_creator_id uuid,
  p_donor_nickname text,
  p_order_id text,
  p_payment_id text,
  p_amount integer,
  p_message text,
  p_is_message_public boolean
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_platform_fee integer;
  v_net_amount integer;
  v_donation_id uuid;
  v_existing_count integer;
BEGIN
  -- 중복 결제 방지
  SELECT COUNT(*) INTO v_existing_count
  FROM public.creator_donations
  WHERE order_id = p_order_id AND status = 'completed';
  
  IF v_existing_count > 0 THEN
    RAISE EXCEPTION 'Duplicate donation order: %', p_order_id;
  END IF;

  -- 수수료 10% 계산
  v_platform_fee := FLOOR(p_amount * 0.1);
  v_net_amount := p_amount - v_platform_fee;

  -- 후원 기록 삽입
  INSERT INTO public.creator_donations (
    creator_id, donor_id, donor_nickname, amount, platform_fee, net_amount,
    message, is_message_public, payment_id, order_id, status
  ) VALUES (
    p_creator_id, p_donor_id, p_donor_nickname, p_amount, v_platform_fee, v_net_amount,
    p_message, p_is_message_public, p_payment_id, p_order_id, 'completed'
  ) RETURNING id INTO v_donation_id;

  -- creator_earnings 누적 (없으면 생성)
  INSERT INTO public.creator_earnings (creator_id, total_earnings, pending_amount, donation_total)
  VALUES (p_creator_id, v_net_amount, v_net_amount, v_net_amount)
  ON CONFLICT (creator_id) DO UPDATE
  SET total_earnings = creator_earnings.total_earnings + v_net_amount,
      pending_amount = creator_earnings.pending_amount + v_net_amount,
      donation_total = creator_earnings.donation_total + v_net_amount,
      updated_at = now();

  -- 크리에이터에게 알림
  INSERT INTO public.notifications (user_id, type, title, message, link)
  SELECT 
    c.user_id,
    'donation',
    '💝 새로운 후원이 도착했어요!',
    p_donor_nickname || '님이 ' || p_amount || '원을 후원했습니다.',
    '/creator/' || c.id
  FROM public.creators c
  WHERE c.id = p_creator_id AND c.user_id IS NOT NULL;

  RETURN v_donation_id;
END;
$$;

-- 10. creator_earnings에 unique constraint 추가 (ON CONFLICT 동작용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'creator_earnings_creator_id_key'
  ) THEN
    ALTER TABLE public.creator_earnings 
    ADD CONSTRAINT creator_earnings_creator_id_key UNIQUE (creator_id);
  END IF;
END $$;