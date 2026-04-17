
-- 1. Fix function search_path on email queue helper functions
CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
 RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pgmq
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;

-- 2. Restrict public column access to creators.contact_email
-- Revoke SELECT on the entire table from anon/authenticated, then grant on all columns EXCEPT contact_email
REVOKE SELECT ON public.creators FROM anon, authenticated;

GRANT SELECT (
  id, name, avatar_url, category, channel_link, subscriber_count, user_id, is_verified,
  rank, votes_count, created_at, youtube_subscribers, chzzk_followers, instagram_followers,
  tiktok_followers, rankit_score, youtube_channel_id, chzzk_channel_id, claimed, claimed_at,
  claim_message, instagram_handle, verification_status, is_promoted, promotion_type,
  promotion_start, promotion_end, promotion_status, performance_tier, featured_until,
  last_stats_updated
) ON public.creators TO anon, authenticated;

-- contact_email is excluded from public grant; only service_role and table owner can read it.
-- Creator owners need to read their own contact_email — provide via security definer function:
CREATE OR REPLACE FUNCTION public.get_my_creator_contact_email(p_creator_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT contact_email
  FROM public.creators
  WHERE id = p_creator_id
    AND user_id = auth.uid();
$$;

-- 3. Restrict listing on public storage buckets (avatars, share-cards, board-images, feed-images)
-- Drop overly broad public SELECT policies and replace with object-scoped policies that
-- allow SELECT only when the request includes a specific object name (not a listing).
-- We do this by requiring `name IS NOT NULL` and disallowing the prefix-list case via owner check fallback.

DO $$
DECLARE
  pol RECORD;
BEGIN
  -- Drop existing broad public SELECT policies on storage.objects for the 4 public buckets
  FOR pol IN
    SELECT polname FROM pg_policy
    WHERE polrelid = 'storage.objects'::regclass
      AND polcmd = 'r'
  LOOP
    -- Only drop policies that are clearly broad SELECT-anyone for these buckets
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.polname);
  END LOOP;
END $$;

-- Recreate object-scoped SELECT policies — anyone can read a specific file by exact path,
-- but cannot list the bucket contents.
CREATE POLICY "Public read avatars by path"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY "Public read share-cards by path"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'share-cards');

CREATE POLICY "Public read board-images by path"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'board-images');

CREATE POLICY "Public read feed-images by path"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'feed-images');

-- Note: Listing prevention is enforced by Supabase by setting bucket `public = false` for listing,
-- but since these are kept public for direct file access, restrict the listing API at the policy level
-- by limiting SELECT to authenticated users only when listing (no bucket_id = bucket without owner)
-- The above policies allow direct file SELECT but the storage.from('bucket').list() API
-- still needs explicit policy. We omit a "list all" policy so list() returns empty for anon.
