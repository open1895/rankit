-- 시드 활동 실행 로그
CREATE TABLE public.seed_activity_runs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at timestamptz NOT NULL DEFAULT now(),
  mode text NOT NULL DEFAULT 'scheduled',
  comments_added integer NOT NULL DEFAULT 0,
  fanclub_joins_added integer NOT NULL DEFAULT 0,
  board_posts_added integer NOT NULL DEFAULT 0,
  details jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_activity_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seed activity runs"
ON public.seed_activity_runs
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 가상 팬 닉네임/아바타 풀
CREATE TABLE public.seed_bot_pool (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nickname text NOT NULL UNIQUE,
  avatar_seed text NOT NULL DEFAULT '',
  bot_user_id uuid,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.seed_bot_pool ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view seed bot pool"
ON public.seed_bot_pool
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- 자동 시드 토글 (단일 행 설정)
CREATE TABLE public.seed_activity_settings (
  id integer NOT NULL DEFAULT 1 PRIMARY KEY CHECK (id = 1),
  enabled boolean NOT NULL DEFAULT true,
  daily_quota integer NOT NULL DEFAULT 20,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.seed_activity_settings (id, enabled, daily_quota) VALUES (1, true, 20);

ALTER TABLE public.seed_activity_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view seed settings"
ON public.seed_activity_settings
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Admins can update seed settings"
ON public.seed_activity_settings
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- 닉네임 풀 시드 데이터 (한국 팬덤 스타일 별명 60개)
INSERT INTO public.seed_bot_pool (nickname, avatar_seed) VALUES
('별빛팬', 'starfan'), ('응원단장', 'cheerleader'), ('찐팬123', 'realfan'),
('덕질장인', 'duk1'), ('하늘별', 'skystar'), ('달빛소녀', 'moonlight'),
('럭키세븐', 'lucky7'), ('치즈러버', 'cheese'), ('보라돌이', 'purple'),
('민트초코', 'mint'), ('해피데이', 'happyday'), ('포카칩', 'pokachip'),
('구름빵', 'cloudbread'), ('솜사탕', 'cottoncandy'), ('레몬에이드', 'lemonade'),
('밤하늘', 'nightsky'), ('새벽감성', 'dawn'), ('봄날', 'spring'),
('여름밤', 'summer'), ('가을바람', 'autumn'), ('겨울이야기', 'winter'),
('초코파이', 'choco'), ('바닐라스카이', 'vanilla'), ('카라멜팝콘', 'caramel'),
('블루베리', 'blueberry'), ('스트로베리', 'strawberry'), ('망고주스', 'mango'),
('피치피치', 'peach'), ('체리블라썸', 'cherry'), ('라벤더', 'lavender'),
('해바라기', 'sunflower'), ('튤립소녀', 'tulip'), ('장미한송이', 'rose'),
('민들레', 'dandelion'), ('코스모스', 'cosmos'), ('수국', 'hydrangea'),
('파스텔톤', 'pastel'), ('네온사인', 'neon'), ('레인보우', 'rainbow'),
('오로라', 'aurora'), ('우주여행', 'space'), ('별똥별', 'shootingstar'),
('달맞이꽃', 'moonflower'), ('은하수', 'galaxy'), ('밀키웨이', 'milkyway'),
('소나기', 'shower'), ('무지개다리', 'rainbowbridge'), ('파도소리', 'wave'),
('바람돌이', 'wind'), ('햇살가득', 'sunshine'), ('포근한밤', 'cozy'),
('따뜻한차', 'warmtea'), ('달콤꿀', 'honey'), ('상큼레몬', 'lemon'),
('새콤포도', 'grape'), ('달달케이크', 'cake'), ('부드러운', 'soft'),
('반짝반짝', 'sparkle'), ('두근두근', 'heartbeat'), ('설레임', 'excited');