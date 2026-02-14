
-- Create share-cards storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('share-cards', 'share-cards', true);

-- Public read access
CREATE POLICY "Share cards are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'share-cards');

-- Edge function can upload via service role, no INSERT policy needed for anon
