CREATE OR REPLACE FUNCTION public.get_creator_activity_stats(p_creator_id uuid)
RETURNS TABLE(post_count bigint, comment_count bigint, like_count bigint)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT COUNT(*) FROM public.posts WHERE creator_id = p_creator_id) as post_count,
    (SELECT COUNT(*) FROM public.post_comments pc 
     INNER JOIN public.posts p ON p.id = pc.post_id 
     WHERE p.creator_id = p_creator_id) as comment_count,
    (SELECT COALESCE(SUM(likes_count), 0) FROM public.posts WHERE creator_id = p_creator_id) as like_count;
$$;