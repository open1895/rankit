REVOKE EXECUTE ON FUNCTION public.get_unhealthy_youtube_creators() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.get_unhealthy_youtube_creators() TO authenticated;