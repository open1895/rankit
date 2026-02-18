
-- User points table
CREATE TABLE public.user_points (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  balance INTEGER NOT NULL DEFAULT 0,
  total_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own points" ON public.user_points FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points" ON public.user_points FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own points" ON public.user_points FOR UPDATE USING (auth.uid() = user_id);

-- Point transactions log
CREATE TABLE public.point_transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  amount INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.point_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own transactions" ON public.point_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "No direct insert" ON public.point_transactions FOR INSERT WITH CHECK (false);

-- Shop items
CREATE TABLE public.shop_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  price INTEGER NOT NULL,
  category TEXT NOT NULL DEFAULT 'gift',
  image_url TEXT NOT NULL DEFAULT '',
  stock INTEGER DEFAULT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.shop_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active items" ON public.shop_items FOR SELECT USING (is_active = true);

-- Purchase history
CREATE TABLE public.point_purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  item_id UUID NOT NULL REFERENCES public.shop_items(id),
  price_paid INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.point_purchases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own purchases" ON public.point_purchases FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "No direct insert" ON public.point_purchases FOR INSERT WITH CHECK (false);

-- Creator earnings
CREATE TABLE public.creator_earnings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id) UNIQUE,
  total_earnings INTEGER NOT NULL DEFAULT 0,
  settled_amount INTEGER NOT NULL DEFAULT 0,
  pending_amount INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.creator_earnings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator owner can view earnings" ON public.creator_earnings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.creators WHERE id = creator_id AND user_id = auth.uid())
);

-- Settlement requests
CREATE TABLE public.settlement_requests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES public.creators(id),
  amount INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  bank_info TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);
ALTER TABLE public.settlement_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Creator owner can view settlements" ON public.settlement_requests FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.creators WHERE id = creator_id AND user_id = auth.uid())
);
CREATE POLICY "Creator owner can request settlement" ON public.settlement_requests FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.creators WHERE id = creator_id AND user_id = auth.uid())
  AND amount >= 10000
);

-- Seed shop items
INSERT INTO public.shop_items (name, description, price, category, image_url) VALUES
  ('스타벅스 아메리카노', '스타벅스 톨 사이즈 아메리카노 기프티콘', 500, 'gift', '☕'),
  ('배스킨라빈스 싱글콘', '배스킨라빈스 싱글레귤러 기프티콘', 800, 'gift', '🍦'),
  ('CU 3000원권', 'CU 편의점 3000원 금액권', 1500, 'gift', '🏪'),
  ('프리미엄 투표권 x5', '하루 투표 제한 없이 5회 추가 투표', 300, 'vote', '🗳️'),
  ('프리미엄 투표권 x20', '하루 투표 제한 없이 20회 추가 투표', 1000, 'vote', '🗳️'),
  ('프로필 뱃지: 다이아몬드', '프로필에 다이아몬드 뱃지 표시 (7일)', 2000, 'badge', '💎');

-- Trigger for updated_at
CREATE TRIGGER update_user_points_updated_at
  BEFORE UPDATE ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_creator_earnings_updated_at
  BEFORE UPDATE ON public.creator_earnings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
