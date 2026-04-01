
CREATE OR REPLACE FUNCTION public.get_fan_level_multiplier(p_user_id uuid)
RETURNS TABLE(fan_level integer, rp_multiplier numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  vote_count bigint;
  post_count bigint;
  comment_count bigint;
  total_points bigint;
  lvl integer;
  mult numeric;
BEGIN
  SELECT COUNT(*) INTO vote_count FROM public.votes WHERE user_id = p_user_id;
  SELECT COUNT(*) INTO post_count FROM public.posts WHERE nickname IN (
    SELECT display_name FROM public.profiles WHERE user_id = p_user_id
  );
  SELECT COUNT(*) INTO comment_count FROM public.comments WHERE nickname IN (
    SELECT display_name FROM public.profiles WHERE user_id = p_user_id
  );

  total_points := (vote_count * 3) + (post_count * 5) + (comment_count * 1);

  IF total_points >= 500 THEN lvl := 4; mult := 2.0;
  ELSIF total_points >= 200 THEN lvl := 3; mult := 1.5;
  ELSIF total_points >= 50 THEN lvl := 2; mult := 1.2;
  ELSE lvl := 1; mult := 1.0;
  END IF;

  RETURN QUERY SELECT lvl, mult;
END;
$$;
