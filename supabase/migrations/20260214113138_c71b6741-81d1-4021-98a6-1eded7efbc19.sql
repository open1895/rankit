
-- Hash existing plaintext IPs in votes table using SHA-256 via pgcrypto
CREATE EXTENSION IF NOT EXISTS pgcrypto;

UPDATE public.votes 
SET voter_ip = encode(digest(voter_ip, 'sha256'), 'hex')
WHERE length(voter_ip) < 64;

UPDATE public.post_likes 
SET liker_ip = encode(digest(liker_ip, 'sha256'), 'hex')
WHERE length(liker_ip) < 64;
