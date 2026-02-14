
-- Add channel_link column to creators
ALTER TABLE public.creators ADD COLUMN channel_link text NOT NULL DEFAULT '';

-- Allow anyone to insert creators (for onboarding)
CREATE POLICY "Anyone can register as creator"
ON public.creators
FOR INSERT
WITH CHECK (true);

-- Create avatars storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true);

-- Public read access for avatars
CREATE POLICY "Avatar images are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Anyone can upload avatars
CREATE POLICY "Anyone can upload avatars"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'avatars');
