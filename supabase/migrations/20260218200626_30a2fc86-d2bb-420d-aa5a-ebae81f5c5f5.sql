
-- Add columns for channel IDs and last updated timestamp
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS youtube_channel_id text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS chzzk_channel_id text NOT NULL DEFAULT '',
ADD COLUMN IF NOT EXISTS last_stats_updated timestamp with time zone;
