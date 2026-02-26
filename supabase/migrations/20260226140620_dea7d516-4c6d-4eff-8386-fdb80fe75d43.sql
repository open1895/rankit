
-- Add image_urls column to board_posts (array of text for multiple images)
ALTER TABLE public.board_posts ADD COLUMN IF NOT EXISTS image_urls TEXT[] DEFAULT '{}';

-- Create storage bucket for board post images
INSERT INTO storage.buckets (id, name, public) VALUES ('board-images', 'board-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: Anyone can view board images
CREATE POLICY "Anyone can view board images" ON storage.objects FOR SELECT USING (bucket_id = 'board-images');

-- Anyone can upload board images (max 5MB enforced client-side)
CREATE POLICY "Anyone can upload board images" ON storage.objects FOR INSERT WITH CHECK (
  bucket_id = 'board-images' AND (octet_length(name) < 500)
);

-- No update/delete on board images
CREATE POLICY "No update on board images" ON storage.objects FOR UPDATE USING (bucket_id = 'board-images' AND false);
CREATE POLICY "No delete on board images" ON storage.objects FOR DELETE USING (bucket_id = 'board-images' AND false);

-- Update board_posts RLS insert policy to allow image_urls
DROP POLICY "Anyone can insert board posts" ON public.board_posts;
CREATE POLICY "Anyone can insert board posts" ON public.board_posts FOR INSERT WITH CHECK (
  char_length(title) >= 2 AND char_length(title) <= 100
  AND char_length(content) >= 2 AND char_length(content) <= 2000
  AND char_length(author) >= 2 AND char_length(author) <= 20
  AND (image_urls IS NULL OR array_length(image_urls, 1) IS NULL OR array_length(image_urls, 1) <= 5)
);
