-- Remove sensitive tables from realtime publication
-- Use DO block to handle cases where tables may not be in publication
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.profiles;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'profiles not in publication';
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notifications not in publication';
  END;
END $$;