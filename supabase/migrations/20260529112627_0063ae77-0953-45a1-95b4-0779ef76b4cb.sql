-- Block creators from self-escalating protected columns via RLS UPDATE
CREATE OR REPLACE FUNCTION public.prevent_creator_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow service_role / postgres / supabase_admin to bypass
  IF auth.role() = 'service_role' OR current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.votes_count       IS DISTINCT FROM OLD.votes_count
  OR NEW.rank              IS DISTINCT FROM OLD.rank
  OR NEW.is_verified       IS DISTINCT FROM OLD.is_verified
  OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
  OR NEW.claimed           IS DISTINCT FROM OLD.claimed
  OR NEW.claimed_at        IS DISTINCT FROM OLD.claimed_at
  OR NEW.is_promoted       IS DISTINCT FROM OLD.is_promoted
  OR NEW.promotion_status  IS DISTINCT FROM OLD.promotion_status
  OR NEW.promotion_type    IS DISTINCT FROM OLD.promotion_type
  OR NEW.promotion_start   IS DISTINCT FROM OLD.promotion_start
  OR NEW.promotion_end     IS DISTINCT FROM OLD.promotion_end
  OR NEW.featured_until    IS DISTINCT FROM OLD.featured_until
  OR NEW.performance_tier  IS DISTINCT FROM OLD.performance_tier
  OR NEW.rankit_score      IS DISTINCT FROM OLD.rankit_score
  OR NEW.user_id           IS DISTINCT FROM OLD.user_id
  THEN
    RAISE EXCEPTION 'Not allowed to modify protected columns on creators'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_creator_privilege_escalation ON public.creators;
CREATE TRIGGER trg_prevent_creator_privilege_escalation
BEFORE UPDATE ON public.creators
FOR EACH ROW
EXECUTE FUNCTION public.prevent_creator_privilege_escalation();