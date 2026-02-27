
-- Create feed-images storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('feed-images', 'feed-images', true);

-- Anyone can view feed images
CREATE POLICY "Public read feed images" ON storage.objects FOR SELECT USING (bucket_id = 'feed-images');

-- Authenticated users can upload to their own folder
CREATE POLICY "Auth users upload feed images" ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'feed-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
  AND octet_length(name) <= 200
);

-- Users can delete their own feed images
CREATE POLICY "Users delete own feed images" ON storage.objects FOR DELETE
USING (
  bucket_id = 'feed-images'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);
