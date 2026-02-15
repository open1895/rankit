-- Add 2MB file size limit to avatars bucket (server-side enforcement)
UPDATE storage.buckets SET file_size_limit = 2097152 WHERE id = 'avatars';

-- Add 2MB file size limit to share-cards bucket as well
UPDATE storage.buckets SET file_size_limit = 5242880 WHERE id = 'share-cards';