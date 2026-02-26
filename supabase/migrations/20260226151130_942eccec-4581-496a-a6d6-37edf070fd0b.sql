
-- 1. Fix prediction_bets: drop the permissive public SELECT policy
DROP POLICY IF EXISTS "Anyone can view bet counts" ON public.prediction_bets;

-- 2. Create an aggregate view for public bet stats
CREATE OR REPLACE VIEW public.prediction_event_stats AS
SELECT 
  event_id,
  predicted_creator_id,
  COUNT(*) as bet_count,
  SUM(amount) as total_amount
FROM public.prediction_bets
GROUP BY event_id, predicted_creator_id;

ALTER VIEW public.prediction_event_stats OWNER TO postgres;
GRANT SELECT ON public.prediction_event_stats TO anon;
GRANT SELECT ON public.prediction_event_stats TO authenticated;

-- 3. Fix storage: require authentication for avatar uploads
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Anyone can upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload avatars" ON storage.objects;

CREATE POLICY "Authenticated users can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.uid() IS NOT NULL
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
  AND octet_length(name) < 200
);

-- 4. Fix storage: require authentication for board-images uploads
DROP POLICY IF EXISTS "Anyone can upload board images" ON storage.objects;
DROP POLICY IF EXISTS "Restricted board image uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload board images" ON storage.objects;

CREATE POLICY "Authenticated users can upload board images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'board-images'
  AND auth.uid() IS NOT NULL
  AND lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'webp', 'gif')
  AND octet_length(name) < 200
);
