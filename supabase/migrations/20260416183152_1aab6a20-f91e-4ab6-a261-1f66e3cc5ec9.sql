
-- 빈 문자열을 제외한 YouTube 채널 ID에 대해 부분 unique 인덱스 생성
CREATE UNIQUE INDEX IF NOT EXISTS creators_youtube_channel_id_unique
ON public.creators (youtube_channel_id)
WHERE youtube_channel_id IS NOT NULL AND youtube_channel_id != '';
