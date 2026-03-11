
ALTER TABLE public.creators
ADD COLUMN IF NOT EXISTS claimed boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS claimed_at timestamptz,
ADD COLUMN IF NOT EXISTS verification_status text NOT NULL DEFAULT 'none',
ADD COLUMN IF NOT EXISTS contact_email text,
ADD COLUMN IF NOT EXISTS instagram_handle text,
ADD COLUMN IF NOT EXISTS claim_message text;
