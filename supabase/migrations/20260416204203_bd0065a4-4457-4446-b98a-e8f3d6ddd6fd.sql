-- 1. 시즌 한정 뱃지 카탈로그
CREATE TABLE IF NOT EXISTS public.season_limited_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  badge_key TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  emoji TEXT NOT NULL DEFAULT '✨',
  rarity TEXT NOT NULL DEFAULT 'rare',
  price_rp INTEGER NOT NULL DEFAULT 100,
  season_number INTEGER,
  sale_starts_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sale_ends_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '30 days'),
  max_supply INTEGER,
  current_supply INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.season_limited_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active season badges"
  ON public.season_limited_badges FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins manage season badges"
  ON public.season_limited_badges FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. 유저 보유 뱃지
CREATE TABLE IF NOT EXISTS public.user_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  badge_id UUID NOT NULL REFERENCES public.season_limited_badges(id) ON DELETE CASCADE,
  acquired_via TEXT NOT NULL DEFAULT 'purchase',
  season_number INTEGER,
  acquired_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_user_badges_user ON public.user_badges(user_id);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view owned badges"
  ON public.user_badges FOR SELECT
  USING (true);

CREATE POLICY "No direct insert on user_badges"
  ON public.user_badges FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No update on user_badges"
  ON public.user_badges FOR UPDATE
  USING (false);

CREATE POLICY "No delete on user_badges"
  ON public.user_badges FOR DELETE
  USING (false);

-- 3. RP 선물 내역
CREATE TABLE IF NOT EXISTS public.rp_gifts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL,
  receiver_id UUID NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  message TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rp_gifts_sender ON public.rp_gifts(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rp_gifts_receiver ON public.rp_gifts(receiver_id, created_at DESC);

ALTER TABLE public.rp_gifts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Sender or receiver can view gifts"
  ON public.rp_gifts FOR SELECT
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "No direct insert on rp_gifts"
  ON public.rp_gifts FOR INSERT
  WITH CHECK (false);

CREATE POLICY "No update on rp_gifts"
  ON public.rp_gifts FOR UPDATE
  USING (false);

CREATE POLICY "No delete on rp_gifts"
  ON public.rp_gifts FOR DELETE
  USING (false);

-- 4. RP 선물 함수
CREATE OR REPLACE FUNCTION public.gift_rp(
  p_sender_id UUID,
  p_receiver_id UUID,
  p_amount INTEGER,
  p_message TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender_rp INTEGER;
  v_sender_name TEXT;
  v_receiver_name TEXT;
  v_gift_id UUID;
BEGIN
  IF p_sender_id = p_receiver_id THEN
    RAISE EXCEPTION '자기 자신에게 선물할 수 없습니다';
  END IF;

  IF p_amount <= 0 THEN
    RAISE EXCEPTION '선물 금액은 1 RP 이상이어야 합니다';
  END IF;

  IF p_amount > 10000 THEN
    RAISE EXCEPTION '1회 최대 10,000 RP까지 선물 가능합니다';
  END IF;

  -- 보낸 사람 잔액 확인 및 차감
  SELECT tickets, display_name INTO v_sender_rp, v_sender_name
    FROM profiles WHERE user_id = p_sender_id FOR UPDATE;

  IF v_sender_rp IS NULL OR v_sender_rp < p_amount THEN
    RAISE EXCEPTION 'RP가 부족합니다';
  END IF;

  -- 받는 사람 확인
  SELECT display_name INTO v_receiver_name
    FROM profiles WHERE user_id = p_receiver_id;

  IF v_receiver_name IS NULL THEN
    RAISE EXCEPTION '받는 사용자를 찾을 수 없습니다';
  END IF;

  -- 차감/지급
  UPDATE profiles SET tickets = tickets - p_amount WHERE user_id = p_sender_id;
  UPDATE profiles SET tickets = tickets + p_amount WHERE user_id = p_receiver_id;

  -- 거래 기록
  INSERT INTO ticket_transactions (user_id, amount, type, description)
  VALUES (p_sender_id, -p_amount, 'gift_sent', '🎁 ' || COALESCE(v_receiver_name, '익명') || '님에게 선물');

  INSERT INTO ticket_transactions (user_id, amount, type, description)
  VALUES (p_receiver_id, p_amount, 'gift_received', '🎁 ' || COALESCE(v_sender_name, '익명') || '님의 선물');

  -- 선물 내역
  INSERT INTO rp_gifts (sender_id, receiver_id, amount, message)
  VALUES (p_sender_id, p_receiver_id, p_amount, COALESCE(p_message, ''))
  RETURNING id INTO v_gift_id;

  -- 받는 사람 알림
  INSERT INTO notifications (user_id, type, title, message, link)
  VALUES (
    p_receiver_id,
    'gift',
    '🎁 선물이 도착했어요!',
    COALESCE(v_sender_name, '익명') || '님이 ' || p_amount || ' RP를 선물했어요',
    '/my'
  );

  RETURN v_gift_id;
END;
$$;

-- 5. 시즌 뱃지 구매 함수
CREATE OR REPLACE FUNCTION public.purchase_season_badge(
  p_user_id UUID,
  p_badge_id UUID
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_badge RECORD;
  v_user_rp INTEGER;
  v_owned INTEGER;
  v_user_badge_id UUID;
BEGIN
  -- 뱃지 정보 조회 + 락
  SELECT * INTO v_badge FROM season_limited_badges WHERE id = p_badge_id FOR UPDATE;

  IF v_badge.id IS NULL THEN
    RAISE EXCEPTION '존재하지 않는 뱃지입니다';
  END IF;

  IF NOT v_badge.is_active THEN
    RAISE EXCEPTION '판매 중지된 뱃지입니다';
  END IF;

  IF now() < v_badge.sale_starts_at OR now() > v_badge.sale_ends_at THEN
    RAISE EXCEPTION '판매 기간이 아닙니다';
  END IF;

  IF v_badge.max_supply IS NOT NULL AND v_badge.current_supply >= v_badge.max_supply THEN
    RAISE EXCEPTION '한정 수량이 모두 소진되었습니다';
  END IF;

  -- 중복 보유 확인
  SELECT COUNT(*) INTO v_owned FROM user_badges
    WHERE user_id = p_user_id AND badge_id = p_badge_id;

  IF v_owned > 0 THEN
    RAISE EXCEPTION '이미 보유한 뱃지입니다';
  END IF;

  -- RP 차감
  SELECT tickets INTO v_user_rp FROM profiles WHERE user_id = p_user_id FOR UPDATE;

  IF v_user_rp IS NULL OR v_user_rp < v_badge.price_rp THEN
    RAISE EXCEPTION 'RP가 부족합니다';
  END IF;

  UPDATE profiles SET tickets = tickets - v_badge.price_rp WHERE user_id = p_user_id;

  INSERT INTO ticket_transactions (user_id, amount, type, description)
  VALUES (p_user_id, -v_badge.price_rp, 'badge_purchase', '🏆 ' || v_badge.name || ' 뱃지 구매');

  -- 발급
  INSERT INTO user_badges (user_id, badge_id, acquired_via, season_number)
  VALUES (p_user_id, p_badge_id, 'purchase', v_badge.season_number)
  RETURNING id INTO v_user_badge_id;

  UPDATE season_limited_badges SET current_supply = current_supply + 1 WHERE id = p_badge_id;

  RETURN v_user_badge_id;
END;
$$;